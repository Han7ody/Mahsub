/**
 * Storage Helper Functions
 * Handles file uploads for Supabase Storage
 * 
 * Note: Signed URL generation should be done server-side via API routes
 * to avoid exposing service role key. These functions use browser client only.
 */

import { createBrowserClient } from '@/lib/supabase/client'
import { createAttachment } from './repo/attachments'

const USE_BACKEND = process.env.NEXT_PUBLIC_USE_BACKEND === 'true'

/**
 * Upload a receipt image to Supabase Storage
 * Path structure: {businessId}/{transactionId}/{filename}
 * Compresses images larger than 500KB to reduce storage and load times
 */
export async function uploadReceipt(
  file: File,
  businessId: string,
  transactionId: string
): Promise<{ path: string; error: Error | null }> {
  try {
    const supabase = createBrowserClient()
    
    // Compress receipt if it's an image and larger than 500KB
    let fileToUpload = file;
    const isImage = file.type.startsWith('image/');
    
    if (isImage && file.size > 500 * 1024) {
      try {
        const { compressReceipt } = await import('./image-utils');
        fileToUpload = await compressReceipt(file);
        console.log(`Receipt compressed: ${file.size} -> ${fileToUpload.size} bytes`);
      } catch (compressError) {
        console.warn('Receipt compression failed, uploading original:', compressError);
      }
    }
    
    const fileExt = fileToUpload.name.split('.').pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
    const filePath = `${businessId}/${transactionId}/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('receipts')
      .upload(filePath, fileToUpload, {
        cacheControl: '31536000', // Cache for 1 year
        upsert: false,
      })

    if (uploadError) {
      return { path: '', error: uploadError }
    }

    // Create attachment record
    const { error: attachmentError } = await createAttachment({
      businessId,
      transactionId,
      bucket: 'receipts',
      path: filePath,
      fileName: file.name, // Keep original filename for display
      mimeType: fileToUpload.type,
      sizeBytes: fileToUpload.size,
    })

    if (attachmentError) {
      console.warn('Failed to create attachment record:', attachmentError)
      // Don't fail the upload if attachment record creation fails
    }

    return { path: filePath, error: null }
  } catch (error) {
    return { path: '', error: error as Error }
  }
}

/**
 * Upload avatar image with enhanced security validation and compression
 * Path structure: {businessId}/avatars/{entityType}/{entityId}.{ext}
 */
export async function uploadAvatar(
  file: File,
  businessId: string,
  entityType: 'customer' | 'supplier' | 'worker' | 'user',
  entityId: string
): Promise<{ path: string; error: Error | null }> {
  try {
    // Server-side security validation
    const validation = validateImageFileSecurity(file);
    if (!validation.isValid) {
      return { path: '', error: new Error(validation.error || 'Invalid file') };
    }

    // Compress image before upload (reduces 1.5MB -> ~50KB)
    let fileToUpload = file;
    try {
      const { compressAvatar } = await import('./image-utils');
      fileToUpload = await compressAvatar(file);
      console.log(`Avatar compressed: ${file.size} -> ${fileToUpload.size} bytes`);
    } catch (compressError) {
      console.warn('Image compression failed, uploading original:', compressError);
    }

    const supabase = createBrowserClient()
    const fileExt = fileToUpload.name.split('.').pop()?.toLowerCase()
    
    // Sanitize file extension
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
    const safeExt = allowedExtensions.includes(fileExt || '') ? fileExt : 'jpg';
    
    const fileName = `${entityId}.${safeExt}`
    const filePath = `${businessId}/avatars/${entityType}/${fileName}`

    // Delete existing avatar if exists
    await supabase.storage.from('avatars').remove([filePath])

    console.log(`Uploading avatar to: ${filePath}, size: ${fileToUpload.size} bytes`);
    
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, fileToUpload, {
        cacheControl: '31536000', // Cache for 1 year
        upsert: true,
      })

    if (uploadError) {
      console.error('Avatar upload failed:', uploadError);
      return { path: '', error: uploadError }
    }
    
    console.log(`Avatar uploaded successfully to storage: ${filePath}`);
    return { path: filePath, error: null }
  } catch (error) {
    return { path: '', error: error as Error }
  }
}

/**
 * Server-side file validation for security
 */
function validateImageFileSecurity(file: File): { isValid: boolean; error?: string } {
  // 1. MIME type validation
  const allowedMimeTypes = [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/webp',
    'image/gif'
  ];
  
  if (!allowedMimeTypes.includes(file.type)) {
    return { isValid: false, error: 'Invalid file type' };
  }

  // 2. File size validation (max 5MB)
  const maxSize = 5 * 1024 * 1024;
  if (file.size > maxSize) {
    return { isValid: false, error: 'File too large' };
  }

  // 3. Minimum file size (prevent empty files)
  const minSize = 1024; // 1KB
  if (file.size < minSize) {
    return { isValid: false, error: 'File too small' };
  }

  // 4. File name validation
  const dangerousPatterns = [
    /\.\./,           // Directory traversal
    /[<>:"|?*]/,      // Invalid filename characters
    /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i, // Windows reserved names
    /\.(exe|bat|cmd|scr|pif|com|dll|vbs|js|jar|php|asp|jsp)$/i // Executable extensions
  ];

  if (dangerousPatterns.some(pattern => pattern.test(file.name))) {
    return { isValid: false, error: 'Invalid filename' };
  }

  return { isValid: true };
}

/**
 * Delete a file from storage
 */
export async function deleteFile(
  bucket: 'receipts' | 'avatars',
  path: string
): Promise<{ error: Error | null }> {
  try {
    const supabase = createBrowserClient()
    const { error } = await supabase.storage.from(bucket).remove([path])
    
    return { error }
  } catch (error) {
    return { error: error as Error }
  }
}

// In-memory cache for signed URLs to prevent duplicate API calls
const signedUrlCache = new Map<string, { url: string; expiresAt: number }>();
const requestCache = new Map<string, Promise<{ signedUrl: string | null; error: Error | null }>>();

/**
 * Get signed URL for a private file
 * This calls the API route to generate signed URLs server-side
 * Results are cached to prevent duplicate API calls
 */
export async function getSignedUrl(
  bucket: 'receipts' | 'avatars',
  path: string,
  expiresIn: number = 3600,
  download: boolean = false
): Promise<{ signedUrl: string | null; error: Error | null }> {
  const cacheKey = `${bucket}:${path}:${download}`;
  
  try {
    const cached = signedUrlCache.get(cacheKey);
    
    // Return cached URL if still valid (with 5 min buffer)
    if (cached && cached.expiresAt > Date.now() + 5 * 60 * 1000) {
      return { signedUrl: cached.url, error: null };
    }
    
    // Return in-flight request promise if one exists (prevent duplicate requests)
    const inFlight = requestCache.get(cacheKey);
    if (inFlight) {
      return inFlight;
    }
    
    let signedUrl: string | null = null

    // Static hosting (GitHub Pages) has no Next.js route handlers at runtime.
    // Generate signed URLs directly from the browser using the anon key.
    if (USE_BACKEND) {
      const supabase = createBrowserClient()
      const options: any = {}
      if (download) {
        const filename = String(path).split('/').pop() || 'file'
        options.download = filename
      }

      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(path, expiresIn, options)

      if (error) throw error
      signedUrl = data?.signedUrl ?? null
    } else {
      // Server-hosted fallback (requires API route to exist)
      const response = await fetch('/api/storage/signed-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bucket,
          path,
          expiresIn,
          download,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error(`Signed URL API error (${response.status}):`, errorData.error || 'Unknown error', { bucket, path })
        throw new Error(errorData.error || 'Failed to get signed URL')
      }

      const json = await response.json()
      if (json?.error) {
        throw new Error(json.error)
      }
      signedUrl = json?.signedUrl ?? null
    }

    // Cache the signed URL
    if (signedUrl) {
      signedUrlCache.set(cacheKey, {
        url: signedUrl,
        expiresAt: Date.now() + expiresIn * 1000,
      });
    }

    requestCache.delete(cacheKey);
    return { signedUrl, error: null }
  } catch (error) {
    requestCache.delete(cacheKey);
    return { signedUrl: null, error: error as Error }
  }
}


/**
 * Get multiple signed URLs in a single API call (batch)
 * Much faster than calling getSignedUrl multiple times
 */
export async function getSignedUrlsBatch(
  bucket: 'receipts' | 'avatars',
  paths: string[],
  expiresIn: number = 3600
): Promise<{ signedUrls: Record<string, string>; error: Error | null }> {
  try {
    if (paths.length === 0) {
      return { signedUrls: {}, error: null };
    }

    // Check cache first
    const uncachedPaths: string[] = [];
    const cachedUrls: Record<string, string> = {};
    
    for (const path of paths) {
      const cacheKey = `${bucket}:${path}`;
      const cached = signedUrlCache.get(cacheKey);
      
      if (cached && cached.expiresAt > Date.now() + 5 * 60 * 1000) {
        cachedUrls[path] = cached.url;
      } else {
        uncachedPaths.push(path);
      }
    }

    // If all URLs are cached, return immediately
    if (uncachedPaths.length === 0) {
      return { signedUrls: cachedUrls, error: null };
    }

    let fetchedUrls: Record<string, string> = {}

    if (USE_BACKEND) {
      // Static hosting: generate signed URLs directly via the browser client.
      const supabase = createBrowserClient()
      const results = await Promise.all(
        uncachedPaths.map(async (path) => {
          const { data, error } = await supabase.storage
            .from(bucket)
            .createSignedUrl(path, expiresIn)
          if (error) throw error
          return { path, url: data?.signedUrl ?? '' }
        })
      )

      for (const r of results) {
        if (r.url) fetchedUrls[r.path] = r.url
      }
    } else {
      // Server-hosted fallback: call the API route (requires it to exist at runtime)
      const response = await fetch('/api/storage/signed-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bucket,
          paths: uncachedPaths,
          expiresIn,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get signed URLs');
      }

      const json = await response.json();
      if (json?.error) {
        throw new Error(json.error);
      }

      fetchedUrls = (json?.signedUrls || {}) as Record<string, string>
    }

    // Cache the fetched URLs
    for (const [path, url] of Object.entries(fetchedUrls as Record<string, string>)) {
      signedUrlCache.set(`${bucket}:${path}`, {
        url,
        expiresAt: Date.now() + expiresIn * 1000,
      });
    }

    // Combine cached and fetched URLs
    return { 
      signedUrls: { ...cachedUrls, ...fetchedUrls }, 
      error: null 
    };
  } catch (error) {
    return { signedUrls: {}, error: error as Error };
  }
}
