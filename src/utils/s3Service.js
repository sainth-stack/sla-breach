import { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// AWS Configuration - Use environment variables for security
const AWS_REGION = process.env.REACT_APP_AWS_REGION || 'us-east-1';
const AWS_ACCESS_KEY_ID = process.env.REACT_APP_AWS_ACCESS_KEY_ID ; 
const AWS_SECRET_ACCESS_KEY = process.env.REACT_APP_AWS_SECRET_ACCESS_KEY ;
const S3_BUCKET_NAME = process.env.REACT_APP_S3_BUCKET_NAME || 'sla-breach-data';

// Debug AWS configuration
console.log('🔧 AWS Configuration:', {
  region: AWS_REGION,
  accessKeyId: AWS_ACCESS_KEY_ID ? `${AWS_ACCESS_KEY_ID.substring(0, 8)}...` : 'NOT SET',
  secretAccessKey: AWS_SECRET_ACCESS_KEY ? `${AWS_SECRET_ACCESS_KEY.substring(0, 8)}...` : 'NOT SET',
  bucketName: S3_BUCKET_NAME,
  usingEnvVars: {
    region: !!process.env.REACT_APP_AWS_REGION,
    accessKey: !!process.env.REACT_APP_AWS_ACCESS_KEY_ID,
    secretKey: !!process.env.REACT_APP_AWS_SECRET_ACCESS_KEY,
    bucket: !!process.env.REACT_APP_S3_BUCKET_NAME
  }
});

// Create S3 client
const s3Client = new S3Client({
  region: AWS_REGION,
  credentials: {
    accessKeyId: AWS_ACCESS_KEY_ID,
    secretAccessKey: AWS_SECRET_ACCESS_KEY,
  },
});

// Test S3 connection
const testS3Connection = async () => {
  try {
    console.log('🔍 Testing S3 connection...');
    const command = new ListObjectsV2Command({
      Bucket: S3_BUCKET_NAME,
      MaxKeys: 1,
    });
    
    const response = await s3Client.send(command);
    console.log('✅ S3 connection successful! Bucket accessible.');
    return true;
  } catch (error) {
    console.error('❌ S3 connection failed:', {
      code: error.Code,
      message: error.message,
      statusCode: error.$metadata?.httpStatusCode,
      requestId: error.$metadata?.requestId
    });
    
    // Provide specific error guidance
    if (error.Code === 'NoSuchBucket') {
      console.error('💡 The S3 bucket does not exist. Please create bucket:', S3_BUCKET_NAME);
    } else if (error.Code === 'AccessDenied') {
      console.error('💡 Access denied. Check your AWS credentials and bucket permissions.');
    } else if (error.Code === 'InvalidAccessKeyId') {
      console.error('💡 Invalid access key. Please check your AWS_ACCESS_KEY_ID.');
    } else if (error.Code === 'SignatureDoesNotMatch') {
      console.error('💡 Invalid secret key. Please check your AWS_SECRET_ACCESS_KEY.');
    }
    
    return false;
  }
};

// Test connection on module load
testS3Connection();

export class S3Service {
  // Helper method to get content type based on file extension
  static getContentType(extension) {
    const contentTypes = {
      'csv': 'text/csv',
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'xls': 'application/vnd.ms-excel',
      'txt': 'text/plain',
      'pdf': 'application/pdf',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'json': 'application/json',
      'xml': 'application/xml',
      'zip': 'application/zip',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    };
    
    return contentTypes[extension.toLowerCase()] || 'application/octet-stream';
  }

  // Delete all existing data files to ensure only one file exists
  static async deleteAllDataFiles() {
    try {
      console.log('🗑️ Deleting all existing data files to ensure only one file exists...');
      
      // First, list all files
      const listResult = await this.listFiles();
      if (!listResult.success) {
        console.log('📂 No existing files to delete or failed to list files');
        return { success: true, deletedCount: 0 };
      }

      // Filter for data files (CSV, Excel)
      const dataFiles = listResult.files.filter(file => {
        const extension = file.key.split('.').pop().toLowerCase();
        return ['csv', 'xlsx', 'xls'].includes(extension);
      });

      if (dataFiles.length === 0) {
        console.log('📂 No data files found to delete');
        return { success: true, deletedCount: 0 };
      }

      console.log('🗑️ Found', dataFiles.length, 'data files to delete:', dataFiles.map(f => f.key));

      // Delete all data files
      const deletePromises = dataFiles.map(async (file) => {
        try {
          const command = new DeleteObjectCommand({
            Bucket: S3_BUCKET_NAME,
            Key: file.key,
          });
          
          await s3Client.send(command);
          console.log('✅ Deleted:', file.key);
          return { success: true, key: file.key };
        } catch (error) {
          console.error('❌ Failed to delete:', file.key, error);
          return { success: false, key: file.key, error: error.message };
        }
      });

      const results = await Promise.all(deletePromises);
      const successCount = results.filter(r => r.success).length;
      const failCount = results.filter(r => !r.success).length;

      console.log('🗑️ Deletion summary:', { total: dataFiles.length, success: successCount, failed: failCount });

      return {
        success: failCount === 0,
        deletedCount: successCount,
        failedCount: failCount,
        results
      };

    } catch (error) {
      console.error('💥 Error deleting data files:', error);
      return {
        success: false,
        error: error.message,
        deletedCount: 0
      };
    }
  }

  // Upload file to S3
  static async uploadFile(file, fileName = null) {
    try {
      // FIRST: Delete all existing data files to ensure only one file exists
      console.log('🔄 Ensuring only one data file exists - deleting all previous files...');
      const deleteResult = await this.deleteAllDataFiles();
      
      if (deleteResult.deletedCount > 0) {
        console.log('✅ Successfully deleted', deleteResult.deletedCount, 'previous data files');
      }

      // Use original filename to maintain user's file naming
      const originalName = file.name;
      const fileExtension = originalName.split('.').pop();
      
      // Use original filename 
      const key = fileName || originalName;
      
      console.log('🚀 Starting S3 upload (SINGLE FILE MODE):', { 
        fileName: originalName, 
        key, 
        size: file.size, 
        type: file.type,
        extension: fileExtension,
        bucket: S3_BUCKET_NAME,
        region: AWS_REGION,
        singleFileMode: true,
        previousFilesDeleted: deleteResult.deletedCount
      });
      
      // Validate file
      if (!file || !file.name) {
        throw new Error('Invalid file object');
      }
      
      if (file.size === 0) {
        throw new Error('File is empty');
      }
      
      // Additional file validation
      console.log('🔍 File validation:', {
        isFile: file instanceof File,
        isBlob: file instanceof Blob,
        hasName: !!file.name,
        hasSize: !!file.size,
        hasType: !!file.type,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified,
        originalName: originalName,
        fileExtension: fileExtension
      });
      
      if (!(file instanceof File || file instanceof Blob)) {
        throw new Error('File must be a File or Blob object');
      }
      
      // Convert file to ArrayBuffer to avoid stream issues
      console.log('🔄 Converting file to ArrayBuffer...');
      const arrayBuffer = await file.arrayBuffer();
      
      const command = new PutObjectCommand({
        Bucket: S3_BUCKET_NAME,
        Key: key,
        Body: arrayBuffer,
        ContentType: file.type || this.getContentType(fileExtension),
        Metadata: {
          'uploaded-by': localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')).email : 'unknown',
          'upload-time': new Date().toISOString(),
          'original-filename': originalName,
          'file-extension': fileExtension
        },
      });

      console.log('📤 Sending upload command to S3 (SINGLE FILE MODE)...');
      console.log('🎯 This is now the ONLY data file in the bucket');
      const result = await s3Client.send(command);
      
      console.log('✅ S3 upload successful (SINGLE FILE UPLOADED):', { 
        key, 
        etag: result.ETag, 
        url: `https://${S3_BUCKET_NAME}.s3.${AWS_REGION}.amazonaws.com/${key}`,
        fileSize: file.size,
        contentType: file.type,
        originalName: originalName,
        requestId: result.$metadata?.requestId,
        singleFileMode: true,
        previousFilesDeleted: deleteResult.deletedCount,
        versionId: result.VersionId || 'no-versioning'
      });
      
      // Confirm this is the only file
      console.log('🎯 Upload complete - This is now the ONLY data file in S3');
      
      return {
        success: true,
        key: key,
        url: `https://${S3_BUCKET_NAME}.s3.${AWS_REGION}.amazonaws.com/${key}`,
        etag: result.ETag,
        originalName: originalName,
        fileExtension: fileExtension,
        singleFileMode: true,
        previousFilesDeleted: deleteResult.deletedCount
      };
    } catch (error) {
      console.error('❌ Error uploading file to S3:', {
        error: error.message,
        code: error.Code,
        statusCode: error.$metadata?.httpStatusCode,
        requestId: error.$metadata?.requestId,
        fileName: file?.name,
        fileSize: file?.size
      });
      
      // Provide specific error guidance
      let errorMessage = error.message;
      if (error.Code === 'NoSuchBucket') {
        errorMessage = `S3 bucket '${S3_BUCKET_NAME}' does not exist. Please create the bucket first.`;
      } else if (error.Code === 'AccessDenied') {
        errorMessage = 'Access denied. Check your AWS credentials and bucket permissions.';
      } else if (error.Code === 'InvalidAccessKeyId') {
        errorMessage = 'Invalid AWS access key. Please check your credentials.';
      } else if (error.Code === 'SignatureDoesNotMatch') {
        errorMessage = 'Invalid AWS secret key. Please check your credentials.';
      }
      
      return {
        success: false,
        error: errorMessage,
        details: {
          code: error.Code,
          statusCode: error.$metadata?.httpStatusCode,
          requestId: error.$metadata?.requestId
        }
      };
    }
  }

  // Get signed URL for downloading file
  static async getDownloadUrl(key, expiresIn = 3600) {
    try {
      const command = new GetObjectCommand({
        Bucket: S3_BUCKET_NAME,
        Key: key,
      });

      const signedUrl = await getSignedUrl(s3Client, command, { expiresIn });
      
      return {
        success: true,
        url: signedUrl,
      };
    } catch (error) {
      console.error('Error getting download URL:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // List files in S3 bucket
  static async listFiles(prefix = '') {
    try {
      const command = new ListObjectsV2Command({
        Bucket: S3_BUCKET_NAME,
        Prefix: prefix,
        MaxKeys: 100,
        // Add cache busting to ensure fresh results
        RequestPayer: undefined,
      });

      const response = await s3Client.send(command);
      
      const files = response.Contents?.map(object => ({
        key: object.Key,
        size: object.Size,
        lastModified: object.LastModified,
        url: `https://${S3_BUCKET_NAME}.s3.${AWS_REGION}.amazonaws.com/${object.Key}`,
        etag: object.ETag, // Include ETag to track file versions
      })) || [];

      // Sort files by last modified date (newest first) to show latest file first
      files.sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));

      console.log('📋 S3 files listed (sorted by newest first):', {
        totalFiles: files.length,
        latestFile: files[0]?.key || 'none',
        latestFileDate: files[0]?.lastModified || 'none',
        latestFileETag: files[0]?.etag || 'none',
        allFiles: files.map(f => ({ name: f.key, modified: f.lastModified, etag: f.etag }))
      });

      return {
        success: true,
        files,
        latestFile: files[0] || null, // Return the latest file separately
      };
    } catch (error) {
      console.error('Error listing files:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Download file from S3
  static async downloadFile(key) {
    try {
      const command = new GetObjectCommand({
        Bucket: S3_BUCKET_NAME,
        Key: key,
      });

      const response = await s3Client.send(command);
      
      // Convert stream to blob using transformToByteArray for better compatibility
      const stream = response.Body;
      let chunks = [];
      
      if (stream.transformToByteArray) {
        // Use AWS SDK's built-in method if available
        const byteArray = await stream.transformToByteArray();
        chunks = [byteArray];
      } else {
        // Fallback to manual stream reading
        const reader = stream.getReader ? stream.getReader() : stream;
        
        if (reader.read) {
          // Handle ReadableStream
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            chunks.push(value);
          }
        } else {
          // Handle async iterable
          for await (const chunk of stream) {
            chunks.push(chunk);
          }
        }
      }
      
      const blob = new Blob(chunks, { type: response.ContentType });
      
      return {
        success: true,
        blob,
        contentType: response.ContentType,
        metadata: response.Metadata,
      };
    } catch (error) {
      console.error('Error downloading file:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

export default S3Service; 