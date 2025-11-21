"use strict";
/**
 * Cloud Function: Image Enhancement Trigger
 *
 * Automatically processes uploaded images:
 * 1. Validates the upload
 * 2. Generates multiple sizes and formats
 * 3. Applies professional enhancements
 * 4. Uploads variants to Storage
 * 5. Writes metadata for fast lookups
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.processProductImage = void 0;
const storage_1 = require("firebase-functions/v2/storage");
const admin = __importStar(require("firebase-admin"));
const config_1 = require("./config");
const imaging_1 = require("./imaging");
// Initialize Firebase Admin
if (!admin.apps.length) {
    admin.initializeApp();
}
const storage = admin.storage();
const db = admin.firestore();
/**
 * Validate file is a processable image
 */
function isProcessableImage(contentType) {
    if (!contentType)
        return false;
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
    return validTypes.includes(contentType.toLowerCase());
}
/**
 * Check if file is in the originals path
 */
function isOriginalUpload(filePath) {
    return filePath.startsWith(config_1.IMAGE_CONFIG.PATHS.originalsPrefix) &&
        !filePath.includes('/variants/');
}
/**
 * Extract base filename without extension
 */
function getBaseName(filename) {
    return filename.replace(/\.[^/.]+$/, '');
}
/**
 * Build variant path
 */
function buildVariantPath(contentHash, baseName, width, format) {
    return `${config_1.IMAGE_CONFIG.PATHS.variantsPrefix}${contentHash}/${baseName}-${width}w.${format}`;
}
/**
 * Main Cloud Function - triggers on file upload to Storage
 */
exports.processProductImage = (0, storage_1.onObjectFinalized)({
    timeoutSeconds: 540,
    memory: '2GiB',
    region: 'europe-west2'
}, async (event) => {
    const startTime = Date.now();
    const object = event.data;
    const filePath = object.name;
    const contentType = object.contentType;
    console.log(`[Enhance] Triggered for: ${filePath}`);
    // 1. VALIDATE: Check if we should process this file
    if (!isOriginalUpload(filePath)) {
        console.log(`[Enhance] Skipping: not in originals path`);
        return null;
    }
    if (!isProcessableImage(contentType)) {
        console.log(`[Enhance] Skipping: not a processable image (${contentType})`);
        return null;
    }
    // Check file size
    const sizeBytes = typeof object.size === 'string' ? parseInt(object.size) : (object.size || 0);
    if (sizeBytes > config_1.IMAGE_CONFIG.LIMITS.maxBytes) {
        console.error(`[Enhance] File too large: ${sizeBytes} bytes (max: ${config_1.IMAGE_CONFIG.LIMITS.maxBytes})`);
        return null;
    }
    if (sizeBytes === 0) {
        console.error(`[Enhance] File is empty`);
        return null;
    }
    try {
        // 2. DOWNLOAD: Get the original file
        const bucket = storage.bucket(object.bucket);
        const file = bucket.file(filePath);
        console.log(`[Enhance] Downloading original...`);
        const [downloadBuffer] = await file.download();
        console.log(`[Enhance] Downloaded ${downloadBuffer.length} bytes`);
        // 3. ANALYZE: Get metadata and compute content hash
        const metadata = await (0, imaging_1.getImageMetadata)(downloadBuffer);
        const contentHash = (0, imaging_1.computeContentHash)(downloadBuffer);
        console.log(`[Enhance] Image: ${metadata.width}x${metadata.height}, hash: ${contentHash}`);
        // 4. CHECK CACHE: See if we already processed this exact image
        const cacheDoc = await db.collection('image_cache').doc(contentHash).get();
        if (cacheDoc.exists) {
            console.log(`[Enhance] Cache hit - variants already exist for hash ${contentHash}`);
            // Update the original file's custom metadata to point to variants
            await file.setMetadata({
                metadata: {
                    contentHash,
                    variantsGenerated: 'true',
                    processedAt: new Date().toISOString()
                }
            });
            return null;
        }
        // 5. GENERATE: Create all variants
        console.log(`[Enhance] Generating variants...`);
        const variants = await (0, imaging_1.generateVariants)(downloadBuffer, contentHash);
        // 6. GENERATE LQIP: Create blur placeholder
        console.log(`[Enhance] Generating LQIP...`);
        const lqipDataURL = await (0, imaging_1.generateLQIP)(downloadBuffer);
        // 7. UPLOAD: Upload all variants to Storage
        const filename = filePath.split('/').pop();
        const baseName = getBaseName(filename);
        const uploadPromises = [];
        const variantPaths = {};
        for (const [variantKey, result] of variants.entries()) {
            const [widthPart, format] = variantKey.split('.');
            const width = parseInt(widthPart.replace('w', ''));
            const variantPath = buildVariantPath(contentHash, baseName, width, format);
            const variantFile = bucket.file(variantPath);
            const contentTypeMap = {
                avif: 'image/avif',
                webp: 'image/webp',
                jpeg: 'image/jpeg',
                png: 'image/png'
            };
            uploadPromises.push(variantFile.save(result.buffer, {
                metadata: {
                    contentType: contentTypeMap[format],
                    cacheControl: `public, max-age=${config_1.IMAGE_CONFIG.CACHE.maxAge}${config_1.IMAGE_CONFIG.CACHE.immutable ? ', immutable' : ''}`,
                    metadata: {
                        originalWidth: metadata.width.toString(),
                        originalHeight: metadata.height.toString(),
                        variantWidth: result.width.toString(),
                        variantHeight: result.height.toString(),
                        contentHash,
                        generatedAt: new Date().toISOString()
                    }
                },
                public: true // Make publicly accessible
            }).then(() => {
                // Get the public URL
                return variantFile.getSignedUrl({
                    action: 'read',
                    expires: '03-01-2500' // Far future expiry for public URLs
                }).then(([url]) => {
                    variantPaths[variantKey] = url;
                });
            }));
        }
        console.log(`[Enhance] Uploading ${uploadPromises.length} variants...`);
        await Promise.all(uploadPromises);
        // 8. CACHE: Store metadata in Firestore for fast lookups
        const cacheData = {
            contentHash,
            originalWidth: metadata.width,
            originalHeight: metadata.height,
            originalFormat: metadata.format,
            originalSize: metadata.size,
            hasAlpha: metadata.hasAlpha,
            lqip: lqipDataURL,
            variants: variantPaths,
            widths: Array.from(variants.keys()).map(k => parseInt(k.split('.')[0].replace('w', ''))),
            formats: [...new Set(Array.from(variants.keys()).map(k => k.split('.')[1]))],
            processedAt: admin.firestore.FieldValue.serverTimestamp(),
            processingTimeMs: Date.now() - startTime
        };
        await db.collection('image_cache').doc(contentHash).set(cacheData);
        // 9. UPDATE: Add metadata to original file
        await file.setMetadata({
            metadata: {
                contentHash,
                variantsGenerated: 'true',
                variantCount: variants.size.toString(),
                processedAt: new Date().toISOString(),
                lqip: lqipDataURL
            }
        });
        const totalTime = Date.now() - startTime;
        console.log(`[Enhance] ✅ Complete! Generated ${variants.size} variants in ${totalTime}ms`);
        console.log(`[Enhance] Cache document: image_cache/${contentHash}`);
        return {
            success: true,
            contentHash,
            variantCount: variants.size,
            processingTimeMs: totalTime
        };
    }
    catch (error) {
        console.error(`[Enhance] ❌ Error processing ${filePath}:`, error);
        // Log error to Firestore for debugging
        await db.collection('image_errors').add({
            filePath,
            error: error.message,
            stack: error.stack,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
        // Don't throw - let the function complete
        return {
            success: false,
            error: error.message
        };
    }
});
//# sourceMappingURL=enhance.js.map