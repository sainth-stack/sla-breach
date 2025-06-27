import React, { useState, useEffect } from 'react';
import { Upload, Button, List, message, Card, Modal, Typography, Space, Spin } from 'antd';
import { UploadOutlined, DeleteOutlined, DownloadOutlined, EyeOutlined } from '@ant-design/icons';
import { isSuperAdmin } from '../../utils/auth';
import S3Service from '../../utils/s3Service';
import './styles.css';

const { Title, Text } = Typography;
const { Dragger } = Upload;

const FileUpload = ({ onUploadSuccess }) => {
  const [uploading, setUploading] = useState(false);
  const [fileList, setFileList] = useState([]);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewFile, setPreviewFile] = useState(null);

  // Check if user is super admin
  const isUserSuperAdmin = isSuperAdmin();

  useEffect(() => {
    if (isUserSuperAdmin) {
      loadUploadedFiles();
    }
  }, [isUserSuperAdmin]);

  const testS3Connection = async () => {
    try {
      console.log('🔍 Testing S3 connection from browser...');
      const result = await S3Service.listFiles();
      if (result.success) {
        console.log('✅ S3 connection successful from browser!');
        message.success('S3 connection successful!');
      } else {
        console.error('❌ S3 connection failed from browser:', result.error);
        message.error(`S3 connection failed: ${result.error}`);
      }
    } catch (error) {
      console.error('💥 S3 connection test error:', error);
      message.error(`S3 test error: ${error.message}`);
    }
  };

  const loadUploadedFiles = async () => {
    setLoading(true);
    try {
      const result = await S3Service.listFiles();
      if (result.success) {
        setUploadedFiles(result.files);
      } else {
        message.error('Failed to load uploaded files');
      }
    } catch (error) {
      console.error('Error loading files:', error);
      message.error('Error loading files');
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async () => {
    if (fileList.length === 0) {
      message.warning('Please select files to upload');
      return;
    }

    console.log('🚀 Starting upload process for', fileList.length, 'files');
    setUploading(true);
    
    try {
      const uploadPromises = fileList.map(async (file) => {
        console.log('📁 Processing file:', file.name, 'Size:', file.size, 'Type:', file.type);
        console.log('📄 File object details:', {
          hasOriginFileObj: !!file.originFileObj,
          originFileObjType: typeof file.originFileObj,
          originFileObjName: file.originFileObj?.name,
          originFileObjSize: file.originFileObj?.size,
          originFileObjType: file.originFileObj?.type,
          isFile: file.originFileObj instanceof File,
          isBlob: file.originFileObj instanceof Blob
        });
        
        if (!file.originFileObj) {
          console.error('❌ No originFileObj found for file:', file.name);
          return { file, result: { success: false, error: 'No file object found' } };
        }
        
        const result = await S3Service.uploadFile(file.originFileObj);
        return { file, result };
      });

      const results = await Promise.all(uploadPromises);
      
      let successCount = 0;
      let failureCount = 0;

      results.forEach(({ file, result }) => {
        if (result.success) {
          successCount++;
          console.log('✅ Upload successful for:', file.name, 'S3 Key:', result.key);
        } else {
          failureCount++;
          console.error(`❌ Failed to upload ${file.name}:`, result.error);
          if (result.details) {
            console.error('Error details:', result.details);
          }
        }
      });

      console.log('📊 Upload summary:', { total: fileList.length, success: successCount, failed: failureCount });

      if (successCount > 0) {
        message.success(`Successfully uploaded ${successCount} file(s)`);
        setFileList([]);
        loadUploadedFiles(); // Refresh the list
        if (onUploadSuccess) {
          onUploadSuccess(successCount);
        }
      }

      if (failureCount > 0) {
        const errorDetails = results
          .filter(({ result }) => !result.success)
          .map(({ file, result }) => `${file.name}: ${result.error}`)
          .join('\n');
        
        message.error(`Failed to upload ${failureCount} file(s). Check console for details.`);
        console.error('❌ Upload failures:', errorDetails);
      }

    } catch (error) {
      console.error('💥 Upload process error:', error);
      message.error(`Upload failed: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (file) => {
    try {
      const result = await S3Service.getDownloadUrl(file.key);
      if (result.success) {
        // Create a temporary link to download the file
        const link = document.createElement('a');
        link.href = result.url;
        link.download = file.key.split('-').slice(1).join('-'); // Remove timestamp prefix
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        message.success('Download started');
      } else {
        message.error('Failed to generate download link');
      }
    } catch (error) {
      console.error('Download error:', error);
      message.error('Download failed');
    }
  };

  const handlePreview = async (file) => {
    try {
      const result = await S3Service.downloadFile(file.key);
      if (result.success) {
        setPreviewFile({
          name: file.key,
          url: URL.createObjectURL(result.blob),
          type: result.contentType,
        });
        setPreviewVisible(true);
      } else {
        message.error('Failed to load file preview');
      }
    } catch (error) {
      console.error('Preview error:', error);
      message.error('Preview failed');
    }
  };

  const uploadProps = {
    onRemove: (file) => {
      const index = fileList.indexOf(file);
      const newFileList = fileList.slice();
      newFileList.splice(index, 1);
      setFileList(newFileList);
    },
    beforeUpload: (file) => {
      setFileList([...fileList, file]);
      return false;
    },
    fileList,
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleString();
  };

  // Don't render anything if user is not super admin
  if (!isUserSuperAdmin) {
    return null;
  }

  return (
    <div className="file-upload-container">
      <Card title="File Upload Management" className="upload-card">
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          
          {/* Upload Section */}
          <div>
            <Title level={4}>Upload Files</Title>
            <Dragger {...uploadProps} multiple>
              <p className="ant-upload-drag-icon">
                <UploadOutlined />
              </p>
              <p className="ant-upload-text">Click or drag files to this area to upload</p>
              <p className="ant-upload-hint">
                Support for single or bulk upload. Strictly prohibit from uploading company data or other band files
              </p>
            </Dragger>
            
            {fileList.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <Button
                  type="primary"
                  onClick={handleUpload}
                  loading={uploading}
                  style={{ marginTop: 16 }}
                >
                  {uploading ? 'Uploading...' : `Upload ${fileList.length} file(s)`}
                </Button>
              </div>
            )}
          </div>

          {/* Uploaded Files Section */}
          <div>
            <Title level={4}>Uploaded Files</Title>
            <Space style={{ marginBottom: 16 }}>
              <Button 
                onClick={loadUploadedFiles} 
                loading={loading}
              >
                Refresh
              </Button>
              <Button 
                onClick={testS3Connection}
                type="dashed"
              >
                Test S3 Connection
              </Button>
            </Space>
            
            {loading ? (
              <Spin />
            ) : (
              <List
                bordered
                dataSource={uploadedFiles}
                renderItem={(file) => (
                  <List.Item
                    actions={[
                      <Button
                        icon={<EyeOutlined />}
                        onClick={() => handlePreview(file)}
                        size="small"
                      >
                        Preview
                      </Button>,
                      <Button
                        icon={<DownloadOutlined />}
                        onClick={() => handleDownload(file)}
                        size="small"
                      >
                        Download
                      </Button>,
                    ]}
                  >
                    <List.Item.Meta
                      title={file.key.split('-').slice(1).join('-')}
                      description={
                        <Space>
                          <Text type="secondary">Size: {formatFileSize(file.size)}</Text>
                          <Text type="secondary">Modified: {formatDate(file.lastModified)}</Text>
                        </Space>
                      }
                    />
                  </List.Item>
                )}
              />
            )}
          </div>
        </Space>
      </Card>

      {/* Preview Modal */}
      <Modal
        title="File Preview"
        open={previewVisible}
        onCancel={() => {
          setPreviewVisible(false);
          if (previewFile?.url) {
            URL.revokeObjectURL(previewFile.url);
          }
          setPreviewFile(null);
        }}
        footer={null}
        width={800}
      >
        {previewFile && (
          <div>
            <Title level={5}>{previewFile.name}</Title>
            {previewFile.type?.startsWith('image/') ? (
              <img
                src={previewFile.url}
                alt="Preview"
                style={{ width: '100%', maxHeight: '500px', objectFit: 'contain' }}
              />
            ) : previewFile.type?.startsWith('text/') ? (
              <iframe
                src={previewFile.url}
                style={{ width: '100%', height: '400px', border: 'none' }}
                title="File Preview"
              />
            ) : (
              <Text>Preview not available for this file type. Please download to view.</Text>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default FileUpload; 