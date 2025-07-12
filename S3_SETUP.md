# S3 File Upload Setup

This document explains how to set up the S3 file upload functionality for super admin users.

## Prerequisites

1. AWS Account with S3 access
2. S3 bucket created
3. AWS IAM user with S3 permissions

## Environment Variables Setup

Create a `.env` file in the root directory with the following variables:

```bash
REACT_APP_AWS_REGION=us-east-1
REACT_APP_AWS_ACCESS_KEY_ID=your_access_key_id_here
REACT_APP_AWS_SECRET_ACCESS_KEY=your_secret_access_key_here
REACT_APP_S3_BUCKET_NAME=sla-breach-data
```

Replace the placeholder values with your actual AWS credentials.

**Important**: The `.env` file is automatically ignored by git to prevent committing sensitive credentials.

## Console Logging

The application now includes comprehensive console logging for S3 operations:

- **Upload Start**: Logs when a file upload begins with file details
- **Upload Success**: Logs successful uploads with S3 key, ETag, and URL
- **Upload Errors**: Logs detailed error information for failed uploads
- **Upload Summary**: Shows total files processed, successful, and failed counts

To view these logs, open your browser's Developer Tools (F12) and check the Console tab during file uploads.

## AWS S3 Bucket Configuration

### 1. Create S3 Bucket
- Log in to AWS Console
- Navigate to S3 service
- Create a new bucket with a unique name
- Choose your preferred region

### 2. Configure CORS Policy
Add the following CORS configuration to your S3 bucket:

```json
[
    {
        "AllowedHeaders": ["*"],
        "AllowedMethods": ["GET", "POST", "PUT", "DELETE", "HEAD"],
        "AllowedOrigins": ["*"],
        "ExposeHeaders": ["ETag"]
    }
]
```

### 3. Set Bucket Permissions
Configure bucket policy to allow uploads. Example policy:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "AllowUploads",
            "Effect": "Allow",
            "Principal": {
                "AWS": "arn:aws:iam::YOUR_ACCOUNT_ID:user/YOUR_IAM_USER"
            },
            "Action": [
                "s3:PutObject",
                "s3:GetObject",
                "s3:DeleteObject",
                "s3:ListBucket"
            ],
            "Resource": [
                "arn:aws:s3:::your-bucket-name",
                "arn:aws:s3:::your-bucket-name/*"
            ]
        }
    ]
}
```

## IAM User Setup

Create an IAM user with the following policy:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:GetObject",
                "s3:PutObject",
                "s3:DeleteObject",
                "s3:ListBucket",
                "s3:GetObjectVersion"
            ],
            "Resource": [
                "arn:aws:s3:::your-bucket-name",
                "arn:aws:s3:::your-bucket-name/*"
            ]
        }
    ]
}
```

## Super Admin Access

### Current Super Admin User
Only the following user has super admin access and can see the file upload feature:
- **Name**: Krishna Tirumala Reddy
- **Email**: Krishna.tirumalareddy@seleccionconsulting.com
- **Password**: Test@123

### S3 File Override Behavior
The system is now configured to:
- **Single file only**: Only ONE data file exists at any time - all previous files are deleted when uploading new ones
- **Complete replacement**: When uploading a new file, ALL existing data files are removed first
- **Preserve original filenames**: The new file keeps its original name (e.g., `sales-data.csv`, `report.xlsx`)
- **Auto-load latest data**: The system automatically loads the single data file when the page loads
- **Clean storage**: No accumulation of old files - always shows only the most recent upload

### Adding New Super Admin Users
To add more super admin users, edit the `HARDCODED_USERS` array in `src/pages/Auth/login.js`:

```javascript
{
  name: 'New Admin Name',
  email: 'admin@seleccionconsulting.com',
  isSuperAdmin: true
},
```

### Current User List
The following users can access the system with the password `Test@123`:

- Krishna Tirumala Reddy (Krishna.tirumalareddy@seleccionconsulting.com) - **Super Admin**
- Battula Hima Sri (hima.sri@seleccionconsulting.com)
- Das Mistoo (mistoo.das@seleccionconsulting.com)
- Gopal Ravi (ravi.gopal@seleccionconsulting.com)
- Jaleel Mohammed (mohammedjaleel.shaik@seleccionconsulting.com)
- Kumari Antima (antima.kumari@seleccionconsulting.com)
- Kuntal Patel (kuntal.patel@seleccionconsulting.com)
- Menon Nivhin (nivhin.menon@seleccionconsulting.com)
- Murugesan Venkatesan (venkatesan.murugesan@seleccionconsulting.com)
- Narayanan Balaji (balaji.narayanan@seleccionconsulting.com)
- NETKE AKSHAY (akshay.netke@seleccionconsulting.com)
- Nookala Maheedhar (maheedhar.nookala@seleccionconsulting.com)
- Patel Ankit (ankit.patel@seleccionconsulting.com)
- SANDEEP SV Guru (sandeep.sankavenkata@seleccionconsulting.com)
- Shatabdi Roy (shatabdi.roy@seleccionconsulting.com)
- Sundarrajan Alagudurai (alagudurai.s@seleccionconsulting.com)
- Tushar Adit (adit.paleja@seleccionconsulting.com)
- URKUNDE Shubham (shubham.urkunde@seleccionconsulting.com)
- Vasanthakumari Pradheepasokan (pradheep.av@seleccionconsulting.com)
- Shubham Thube (shubham.thube@seleccionconsulting.com)

## Usage

1. Login with super admin credentials
2. Navigate to Bot or Data pages
3. The file upload section will appear at the top for super admins
4. Upload files using drag-and-drop or file selection
5. View, download, or preview uploaded files
6. Files are stored securely in your S3 bucket

## Security Notes

- Keep your AWS credentials secure
- Use IAM roles in production instead of hardcoded credentials
- Regularly rotate access keys
- Monitor S3 bucket access logs
- Consider implementing file type restrictions
- Set up proper backup and lifecycle policies for your S3 bucket

## Troubleshooting

### Common Issues:
1. **Access Denied**: Check IAM permissions and bucket policy
2. **CORS Errors**: Verify CORS configuration on S3 bucket
3. **File Upload Fails**: Check network connectivity and AWS credentials
4. **Preview Not Working**: Ensure file types are supported and accessible

### Debug Steps:
1. Check browser console for error messages
2. Verify environment variables are loaded correctly
3. Test AWS credentials using AWS CLI
4. Check S3 bucket permissions and CORS settings 