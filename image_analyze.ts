import { mutation, query, action } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { api } from "./_generated/api";
import axios from "axios";
import { GoogleGenerativeAI } from "@google/generative-ai";


export const analyzeWebsite = action({
  args: { url: v.string() },
  handler: async (ctx, { url }): Promise<Id<"websites">> => {

    const fullUrl = `https://r.jina.ai/${url}`;
    const options = {
      method: "GET",
      headers: {
        Authorization:
          "Bearer jina_b801591a53be4b6c970f61dc43b1cd39s5SbtlYGsbfNHP_ImGiI7BqKUtDd",
        "X-With-Images-Summary": "true",
      },
    };

    try {
      const response = await axios.get(fullUrl, options);

      if (!response.status) {
        throw new Error(
          `API request failed with status ${response.status}: ${response.statusText}`
        );
      }

      const data = await response.data;
      console.log(data);
      const imageLinks = extractImageLinks(data);
      const imageCount = imageLinks.length;

      if (imageCount === 0) {
        throw new ConvexError("No images found for analysis");
      }

      // Insert website data using a mutation
      const websiteId: Id<"websites"> = await ctx.runMutation(
        api.image_analyze.insertWebsite,
        {
          url: url,
          images: imageCount,
          links: imageLinks,
        }
      );

      // Schedule the processing of links
      await ctx.scheduler.runAfter(0, api.image_analyze.processLinks, {
        websiteId,
      });

      return websiteId;
    } catch (error) {
      console.error("Error during fetch API call or analysis:", error);
      throw new ConvexError(`Failed to analyze website: ${error}`);
    }
  },
});

export const insertWebsite = mutation({
  args: {
    url: v.string(),
    images: v.number(),
    links: v.array(v.string()),
  },
  handler: async (ctx, args): Promise<Id<"websites">> => {
    try {
      const websiteId = await ctx.db.insert("websites", args);
      console.log("Inserted website with ID:", websiteId);
      return websiteId;
    } catch (error) {
      console.error("Error inserting website:", error);
      throw new Error(`Failed to insert website: ${error}`);
    }
  },
});

export const processLinks = action({
  args: { websiteId: v.id("websites") },
  handler: async (ctx, { websiteId }) => {
    const website = await ctx.runQuery(api.analyseimage.getWebsite, {
      id: websiteId,
    });
    if (!website) {
      throw new ConvexError("Website not found");
    }

    for (const imageUrl of website.links) {
      console.log(imageUrl);
      //add the code to get the chat completion
      const chatCompletion = await analyzeImages(imageUrl);
      const content = JSON.parse(
        chatCompletion.text() || "{}"
      );

      await ctx.runMutation(api.analyseimage.insertAnalyzedLink, {
        websiteId,
        imageUrl,
        type: content.Type,
        shortDescription: content.short,
        fullDescription: content.full,
      });

      await new Promise((resolve) => setTimeout(resolve, 10000));
    }
  },
});

export const getWebsite = query({
  args: { id: v.id("websites") },
  handler: async (ctx, { id }) => {
    return await ctx.db.get(id);
  },
});

export const insertAnalyzedLink = mutation({
  args: {
    websiteId: v.id("websites"),
    imageUrl: v.string(),
    type: v.string(),
    shortDescription: v.string(),
    fullDescription: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("analyzedLinks", args);
  },
});

export const getAnalyzedLinks = query({
  args: { websiteId: v.id("websites") },
  handler: async (ctx, { websiteId }) => {
    return await ctx.db
      .query("analyzedLinks")
      .filter((q) => q.eq(q.field("websiteId"), websiteId))
      .order("desc")
      .collect();
  },
});

const genAI = new GoogleGenerativeAI("AIzaSyBDUJL_vOc8gNMzpRnvONhIByUo-UoX_P8");

const model = genAI.getGenerativeModel({
  model: "gemini-1.5-flash",
});

async function analyzeImages(imageURL: string) {
    const prompt = `Analyse in detail what is present in the image. Always provide the response in the following structured JSON format.
              
              Image Type Enum Definition:
              
              The "Type" field should be one of the following:

              - "Chart": all kinds of data visualisation, if the image contains for example chart, data, Science & Biology, graph, diagram, measurements or analysis, Logic & Statistics.
              - "Person": if the image features one or more people.
              - "Animal": if the image contains animals.
              - "Building": if the image contains buildings, infrastructure, or architecture.
              - "Nature_Scene": if the image features a natural landscape, like a forest, lake, or mountains.
              - "Object": if the image contains inanimate objects such as vehicles, electronic devices, tools, etc.
              - "Other": if the image doesn't match any of the above, provide your own type value.

            ### Expected Output Format
              
            Please provide the output in the following JSON format:   
              {
                  "Type": "<Type of object(s) or scene from the enum>",
                  "short": "<Brief meaning of the content of image capturing its context and meaning, like chart title if the type is chart>",
                  "full": "<Detailed description and analysis of the image>"
              }

            Do not add to yout response any preambule or explanations. just provide response in expected output format.
            Your task is to identify the type of the image first, and then fill out the short and full descriptions accordingly.

            Before you finish the task, revise your response and verify
            1) if the output is in the expected json format
            2) if the json has 3 properties: Type, short, full
      
      The image: ${imageURL}`;
  
      const result = await model.generateContent(prompt);
      console.log(`Image URL: ${imageURL}`);
      console.log(result.response.text()); // Display the result in JSON format

      return result.response;
}

function removeUpToExpression(input: string, expression: string): string {
  // Find the index of the expression
  const index = input.indexOf(expression);

  // Check if the expression was found
  if (index === -1) {
    // Expression not found; return the original string
    return input;
  }

  // Slice the string from the end of the expression
  return input.slice(index + expression.length);
}

function extractImageLinks(content: string): string[] {
  const imageLinks: string[] = [];

  content = removeUpToExpression(content, "Images:");

  // Regex pattern to match URLs that start with https and end with one of the given image extensions
  const imageLinkRegex: RegExp =
    /(https:\/\/[^\s]+?\.(?:png|jpg|jpeg|gif|webp|PNG|JPG|JPEG|GIF|WEBP))/gi;

  let match: RegExpExecArray | null;

  // Find all matches and store them in the imageLinks array
  while ((match = imageLinkRegex.exec(content)) !== null) {
    imageLinks.push(match[1]);
  }

  if (imageLinks.length === 0) {
    console.log("No images in correct format found in the content.");
  }

  console.log("Extracted image links:", imageLinks);
  return imageLinks;
}