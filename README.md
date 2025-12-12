# 🎵 Demucs Audio Separator

> **AI-Powered Cloud-Native Audio Source Separation Application**

A production-ready, serverless web application that leverages state-of-the-art deep learning models to separate vocals and instrumentals from audio tracks. Built with scalable AWS infrastructure and modern web technologies.

[![Live Demo](https://img.shields.io/badge/demo-live-success)](https://your-netlify-url.netlify.app)
[![AWS](https://img.shields.io/badge/AWS-Deployed-orange)](https://aws.amazon.com/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

---

## 🎯 Project Overview

This application demonstrates **end-to-end AI model deployment** on AWS cloud infrastructure, showcasing expertise in:
- **Machine Learning Operations (MLOps)** - Containerized AI model deployment
- **Cloud Architecture** - Serverless, event-driven design patterns
- **Infrastructure as Code** - AWS services orchestration
- **Production ML Systems** - Real-time inference with auto-scaling

### Key Highlights
- 🤖 **Deep Learning Model**: Facebook Research's Demucs (Hybrid Transformer Demucs)
- ☁️ **Cloud-Native**: 100% serverless AWS infrastructure
- 📈 **Auto-Scaling**: Scales to zero when idle, reduces costs by 90%
- 🔒 **Secure**: API Gateway with CORS, rate limiting, and IAM-based authentication
- ⚡ **Asynchronous Processing**: Handles long-running ML inference jobs efficiently

---

## 🏗️ Architecture

### High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                          USER INTERFACE                              │
│                     (React SPA on Netlify)                          │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             │ HTTPS
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      AWS HTTP API GATEWAY                            │
│  • CORS Protection      • Rate Limiting (10 req/sec)                │
│  • Request Validation   • CloudWatch Logging                        │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             │ IAM Auth
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      AWS LAMBDA FUNCTIONS                            │
│                        (Node.js 24.x)                               │
├─────────────────┬──────────────┬──────────────┬─────────────────────┤
│  Upload Lambda  │Process Lambda│ Status Lambda│  Cleanup Lambda     │
│  (Presigned URL)│ (Start Job)  │(Poll Results)│ (Delete Files)      │
└────────┬────────┴──────┬───────┴──────┬───────┴─────────────────────┘
         │               │              │
         │               │              │
         ▼               ▼              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         AMAZON S3                                    │
│  • Input Storage        • Output Storage                            │
│  • Session Management   • Presigned URLs (1hr expiry)               │
└─────────────────────────────┬───────────────────────────────────────┘
                              │
                              │ S3 Event Trigger
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│               AMAZON SAGEMAKER ASYNCHRONOUS INFERENCE                │
│                                                                      │
│  ┌────────────────────────────────────────────────────────┐        │
│  │          CUSTOM DOCKER CONTAINER (ECR)                 │        │
│  │  • Base: NVIDIA CUDA 11.8 + cuDNN 8                   │        │
│  │  • Framework: PyTorch with GPU support                │        │
│  │  • AI Model: Demucs (htdemucs) - Hybrid Transformer   │        │
│  │  • Server: Flask (serve.py) on port 8080              │        │
│  └────────────────────────────────────────────────────────┘        │
│                                                                      │
│  Instance: ml.g4dn.xlarge (NVIDIA T4 GPU)                          │
│  Auto-scaling: Scales to 0 when idle → Cost Optimized              │
└──────────────────────────────────────────────────────────────────────┘
```

### Data Flow

```
1. User uploads audio file (MP3/WAV/FLAC)
   ↓
2. Frontend requests presigned S3 URL from Upload Lambda
   ↓
3. Direct upload to S3 (bypasses API Gateway for large files)
   ↓
4. Process Lambda invokes SageMaker async endpoint
   ↓
5. SageMaker spins up containerized AI model
   ↓
6. Demucs model performs source separation (vocals + instrumentals)
   ↓
7. Output files uploaded to S3 with session-specific prefix
   ↓
8. Frontend polls Status Lambda every 5 seconds
   ↓
9. Status Lambda returns presigned download URLs
   ↓
10. User downloads separated tracks (vocals.wav, no_vocals.wav)
```

---

## 🧠 AI/ML Technology Stack

### Deep Learning Model
- **Model**: [Demucs v4 (Hybrid Transformer Demucs)](https://github.com/facebookresearch/demucs)
  - State-of-the-art music source separation
  - Hybrid architecture: Transformers + Convolutional layers
  - Two-stem separation: vocals and instrumental (no_vocals)
- **Framework**: PyTorch with CUDA acceleration
- **Inference Time**: 10-15 minutes per 3-minute song (GPU-accelerated)

### ML Infrastructure
- **Containerization**: Docker with NVIDIA CUDA runtime
- **Model Serving**: Custom Flask inference server (`serve.py`)
- **Deployment**: AWS SageMaker Asynchronous Inference
- **Compute**: GPU instance (ml.g4dn.xlarge with NVIDIA T4)
- **Scaling**: Auto-scales to zero instances when idle

### Key ML Operations Features
1. **Model Containerization**: Custom Docker image with all dependencies
2. **CI/CD Pipeline**: AWS CodeBuild → ECR → SageMaker
3. **Asynchronous Inference**: Handles long-running ML jobs without blocking
4. **GPU Optimization**: CUDA 11.8 with cuDNN for accelerated inference
5. **Cost Efficiency**: Pay-per-use model with auto-scaling

---

## 🛠️ Technology Stack

### Frontend
- **Framework**: React 18
- **Styling**: Inline styles with modern gradients
- **Hosting**: Netlify (CDN-backed, auto-deploy)
- **Features**: Real-time status polling, progress indicators

### Backend (AWS Services)
- **API Layer**: HTTP API Gateway
  - RESTful endpoints
  - CORS configuration
  - Throttling: 20 req/sec, 30 burst
  
- **Compute**: AWS Lambda (Node.js 24.x)
  - Upload Handler
  - Processing Orchestrator
  - Status Checker
  - Cleanup Service

- **AI/ML**: Amazon SageMaker
  - Asynchronous Inference Endpoint
  - Custom Docker Container (ECR)
  - GPU Instance: ml.g4dn.xlarge

- **Storage**: Amazon S3
  - Input file storage
  - Session-based output organization
  - Presigned URLs for secure downloads

- **Container Registry**: Amazon ECR
  - Docker image versioning
  - Automated builds via CodeBuild

- **Monitoring**: Amazon CloudWatch
  - Lambda execution logs
  - API Gateway metrics
  - SageMaker endpoint monitoring

---

## 📦 Project Structure

```
Demucs-Audio-Separator/
├── demucs-sagemaker-backend/
│   ├── buildspec.yml           # AWS CodeBuild configuration
│   ├── Dockerfile              # SageMaker container definition
│   ├── requirements.txt        # Python dependencies
│   └── serve.py                # Flask inference server
├── frontend/
│   ├── node_modules/           # Dependencies (generated)
│   ├── public/
│   │   └── index.html          # HTML template
│   ├── src/
│   │   ├── App.js              # React application
│   │   ├── index.css           # Global styles
│   │   └── index.js            # React entry point
│   ├── .gitignore
│   ├── package-lock.json
│   ├── package.json            # Frontend dependencies
│   └── netlify.toml            # Netlify deployment config
├── .gitignore
├── LICENSE
└── README.md
```

**Note**: Lambda functions are deployed separately and not included in this repository. They are managed directly in AWS Lambda console.

---

## 🚀 Deployment Guide

### Prerequisites
- AWS Account with appropriate IAM permissions
- AWS CLI configured
- Docker installed (for local testing)
- Node.js 24.x
- Netlify account

### Step 1: Build and Deploy SageMaker Container

```bash
# Navigate to SageMaker directory
cd backend/sagemaker

# Build Docker image
docker build -t demucs-inference .

# Tag for ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com
docker tag demucs-inference:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/demucs-inference:latest

# Push to ECR
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/demucs-inference:latest
```

### Step 2: Create SageMaker Async Endpoint

```bash
# Create model from ECR image
aws sagemaker create-model \
  --model-name demucs-model \
  --primary-container Image=<account-id>.dkr.ecr.us-east-1.amazonaws.com/demucs-inference:latest \
  --execution-role-arn <sagemaker-role-arn>

# Create endpoint configuration
aws sagemaker create-endpoint-config \
  --endpoint-config-name demucs-async-config \
  --production-variants VariantName=variant1,ModelName=demucs-model,InstanceType=ml.g4dn.xlarge,InitialInstanceCount=1 \
  --async-inference-config OutputConfig={S3OutputPath=s3://your-bucket/sagemaker-output/}

# Create async endpoint
aws sagemaker create-endpoint \
  --endpoint-name demucs-async-endpoint \
  --endpoint-config-name demucs-async-config
```

### Step 3: Deploy Lambda Functions

```bash
# Deploy each Lambda function
cd backend/lambda/upload
zip -r upload.zip .
aws lambda create-function \
  --function-name demucs-upload \
  --runtime nodejs24.x \
  --handler index.handler \
  --zip-file fileb://upload.zip \
  --role <lambda-role-arn>

# Repeat for process, status, and cleanup Lambdas
```

### Step 4: Configure HTTP API Gateway

1. Create HTTP API in AWS Console
2. Add routes: `/upload`, `/process`, `/status`, `/cleanup`
3. Integrate each route with corresponding Lambda
4. Configure CORS for your Netlify domain
5. Enable throttling (20 req/sec)
6. Deploy to production stage

### Step 5: Deploy Frontend

```bash
cd frontend
npm install
npm run build

# Deploy to Netlify
netlify deploy --prod
```

### Step 6: Update Environment Variables

Update `App.js` with your API Gateway URL:
```javascript
const API_BASE_URL = 'https://your-api-id.execute-api.us-east-1.amazonaws.com';
```

---

## 💰 Cost Analysis

**Monthly cost for 10 uploads (~10 songs)**:

| Service | Usage | Cost |
|---------|-------|------|
| SageMaker (ml.g4dn.xlarge) | ~2.5 hours/month | $13.15 |
| Lambda Invocations | ~100 requests | $0.00 |
| API Gateway (HTTP) | ~100 requests | $0.00 |
| S3 Storage | ~500 MB | $0.01 |
| ECR Storage | ~5 GB | $0.50 |
| **Total** | | **~$13.66/month** |

**Cost Optimization**:
- Async inference scales to 0 → No idle costs
- Using HTTP API instead of REST API → 70% cheaper
- Direct S3 uploads → Reduces Lambda data transfer costs

---

## 🔒 Security Features

1. **API Gateway Protection**
   - CORS restricted to frontend domain
   - Rate limiting (prevents DDoS)
   - Request/response validation

2. **IAM-Based Authentication**
   - Lambda functions only accessible via API Gateway
   - SageMaker role with least-privilege access
   - S3 bucket policies for secure storage

3. **Presigned URLs**
   - Time-limited access (1 hour expiry)
   - No public S3 bucket access
   - Secure file upload/download

4. **No Direct Lambda URLs**
   - Function URLs disabled
   - All traffic routes through API Gateway

---

## 📊 Performance Metrics

- **Cold Start**: ~3-5 seconds (Lambda)
- **SageMaker Spin-up**: ~2-3 minutes (first request)
- **Processing Time**: 10-15 minutes per 3-minute song
- **File Size Limit**: Recommended < 50MB
- **Concurrent Processing**: 1 instance (can scale horizontally)

---

## 🎓 Learning Outcomes

This project demonstrates:

### Cloud Architecture
✅ Designing serverless, event-driven systems  
✅ Implementing cost-efficient auto-scaling solutions  
✅ Securing APIs with proper authentication and authorization  
✅ Managing infrastructure on AWS (IaaS, PaaS, SaaS)

### Machine Learning Engineering
✅ Containerizing deep learning models with Docker  
✅ Deploying ML models to production (MLOps)  
✅ Optimizing GPU-based inference workloads  
✅ Implementing asynchronous ML inference patterns  
✅ Managing model artifacts and versioning

### Software Engineering
✅ Building full-stack applications (React + Node.js)  
✅ API design and implementation (RESTful)  
✅ Error handling and logging strategies  
✅ CI/CD pipelines for containerized applications

---

## 🐛 Troubleshooting

### Common Issues

**Issue**: SageMaker endpoint takes too long to respond
- **Solution**: Check CloudWatch logs for model loading issues
- **Tip**: First request after idle period takes 2-3 minutes for instance spin-up

**Issue**: CORS errors in browser
- **Solution**: Verify API Gateway CORS configuration matches Netlify domain
- **Tip**: Clear browser cache after updating CORS settings

**Issue**: Lambda timeout errors
- **Solution**: Increase Lambda timeout to 30 seconds in configuration
- **Tip**: Ensure Lambda has VPC access if SageMaker is in VPC

**Issue**: Out of memory errors in container
- **Solution**: Demucs requires ~8GB RAM, ensure ml.g4dn.xlarge is used
- **Tip**: Monitor CloudWatch Container Insights for memory usage

---

## 🚧 Future Enhancements

- [ ] Support for 4-stem separation (vocals, drums, bass, other)
- [ ] Real-time progress updates via WebSocket
- [ ] Batch processing for multiple files
- [ ] User authentication with AWS Cognito
- [ ] Custom model fine-tuning interface
- [ ] Download history with DynamoDB
- [ ] Email notifications on completion (SNS)
- [ ] Support for video file audio extraction

---

## 📚 Resources

- [Demucs GitHub Repository](https://github.com/facebookresearch/demucs)
- [AWS SageMaker Async Inference Docs](https://docs.aws.amazon.com/sagemaker/latest/dg/async-inference.html)
- [HTTP API Gateway Guide](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api.html)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👤 Author

**Swarup Das**
- LinkedIn: [Swarup Das](https://www.linkedin.com/in/swarup-das-17bb03202)
- Portfolio: [swarupdas-portfolio](https://swarupdas-portfolio.netlify.app)
- Email: sarupsarup66@gmail.com

---

## 🙏 Acknowledgments

- Facebook Research for the Demucs model
- AWS for comprehensive cloud infrastructure
- Open-source community for tools and libraries

---


**⭐ If you found this project helpful, please consider giving it a star!**

Made with ❤️ and ☁️
