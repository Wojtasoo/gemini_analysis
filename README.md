# Video Analysis Script

## Overview

The `video_analyze.js` script uses Google Cloud services to analyze YouTube videos for detecting product placement and brand mentions. It leverages Google's Vertex AI for machine learning and Google Cloud Storage for robust data handling.

## Features

- **Downloads YouTube Videos:** Utilizes `yt-dlp` to download videos directly from YouTube.
- **Cloud Storage Upload:** Uploads the downloaded video to Google Cloud Storage (GCS) for further processing.
- **Video Analysis:** Employs Google Cloud’s Vertex AI to generate a detailed report on product placements and brand mentions within the video.

## Requirements

- **Node.js**: Required to run the script.
- **Google Cloud Account**: Necessary for accessing Google Cloud services.
- **APIs & Libraries**:
  - `@google-cloud/vertexai`
  - `@google-cloud/storage`
  - `yt-dlp` for downloading videos.

Ensure your Google Cloud credentials are configured locally for API access.

## Installation

1. **Clone the Repository** or integrate the script into your project.
   
2. **Install Dependencies**:
   ```bash
   npm install @google-cloud/vertexai @google-cloud/storage
3. **Usage**
    Configuration: Set up your Google Cloud project parameters within the script by updating the projectId, location, and BUCKET_NAME variables.
    Set YouTube URL: Modify the YOUTUBE_URL variable to point to the desired video.
    Run the Script: node video_analyze.js

## License
This project is licensed under the MIT License. See the LICENSE file for more information.

### Instructions:
- Replace `YOUR_GOOGLE_PROJECT_ID`, `YOUR_BUCKET_NAME`, and similar placeholders with actual values from your Google Cloud configuration.
- Adjust the paths to align with your system setup and ensure all parts function correctly when executed`[1]`.
