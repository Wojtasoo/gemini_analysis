import { VertexAI } from "@google-cloud/vertexai";
import { Storage } from "@google-cloud/storage";
import { exec } from "child_process";
import path from "path";
import fs from "fs";

// Set project and location details
const projectId = 'cobalt-pursuit-421600';   // Replace with your Google Cloud Project ID
const location = 'europe-central2-a';        // Specify the location (region)

// Initialize Vertex AI client
const vertexAI = new VertexAI({
  project: projectId,
  location: location,
});

const BUCKET_NAME = 'vid_b';
const storage = new Storage(projectId, process.env.GOOGLE_APPLICATION_CREDENTIALS);
const bucket = storage.bucket(BUCKET_NAME);

// YouTube Video URL
const YOUTUBE_URL = '"https://www.youtube.com/watch?v=S_ihY7eHpTg&ab_channel=JayzTwoCents"';

// Function to download video using yt-dlp
function downloadYouTubeVideo(videoUrl) {
    return new Promise((resolve, reject) => {
        console.log('Downloading video...');
        const command = `yt-dlp -o '%(title)s.%(ext)s' ${videoUrl}`;
        
        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error(`Error downloading video: ${stderr}`);
                reject(error);
            } else {
                const fileName = stdout.trim().split('\n').pop(); // Get the downloaded filename
                console.log(`Downloaded video: ${fileName}`);
                resolve(fileName);
            }
        });
    });
}

// Function to upload video to Google Cloud Storage
function uploadToGCS(filePath) {
    return new Promise((resolve, reject) => {
        const fileName = path.basename(filePath);
        console.log(`Uploading ${fileName} to Google Cloud Storage...`);
        
        bucket.upload(filePath, {
            destination: fileName,
        }, (err, file) => {
            if (err) {
                console.error(`Error uploading to GCS: ${err}`);
                reject(err);
            } else {
                const fileUri = `gs://${BUCKET_NAME}/${fileName}`;
                console.log(`Uploaded video to GCS: ${fileUri}`);
                resolve(fileUri);
            }
        });
    });
}

// Function to clean up downloaded file
function cleanup(filePath) {
    fs.unlink(filePath, (err) => {
        if (err) {
            console.error(`Error deleting file: ${filePath}`);
        } else {
            console.log(`Deleted file: ${filePath}`);
        }
    });
}

async function analyzeVideo(uri) {
  // Replace 'gemini-1.5-flash-001' with the appropriate model you want to use
  const generativeModel = vertexAI.getGenerativeModel({
    model: 'gemini-1.5-flash-001',
  });

  const filePart = {
    file_data: {
      file_uri: uri,
      mime_type: 'video/mp4',
    },
  };

  const textPart = {
    text: `Analyze the video and generate a report about product placement. Report what type of products of what brands where mentioned in a video.`,
  };

  const request = {
    contents: [{role: 'user', parts: [filePart, textPart]}],
  };

  try {
    const resp = await generativeModel.generateContent(request);
    const contentResponse = await resp.response;
    console.log('Response:', JSON.stringify(contentResponse));
  } catch (error) {
    console.error('Error generating content:', error);
  }
}

// Main function
async function main() {
    try {
        // Step 1: Download YouTube Video
        const videoFileName = await downloadYouTubeVideo(YOUTUBE_URL);
        
        // Step 2: Upload Video to Google Cloud Storage
        const fileUri = await uploadToGCS(videoFileName);

        analyzeVideo(fileUri);

        // Step 3: Clean up the local downloaded file
        //cleanup(videoFileName);

        // Output the URI
        console.log(`File available at: ${fileUri}`);
    } catch (err) {
        console.error(`Error: ${err}`);
    }
}

// Execute main function
main();