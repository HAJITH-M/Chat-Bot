const express = require('express');
const playwright = require('playwright');
const url = require('url');
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio'); // To parse HTML easily and extract links

const app = express();
const port = 5000;

// Middleware to handle CORS
app.use(cors());
app.use(express.json());

// Function to extract internal links from a page
const extractInternalLinks = (baseUrl, pageContent, visited) => {
  const $ = cheerio.load(pageContent);
  const links = [];
  
  // Find all anchor tags with href attributes
  $('a').each((_, element) => {
    let href = $(element).attr('href');
    if (href) {
      // Resolve relative links to absolute ones
      const absoluteUrl = url.resolve(baseUrl, href);

      // Ensure it's part of the same domain and not an external link, also check if it's already visited
      if (absoluteUrl.startsWith(baseUrl) && !visited.has(absoluteUrl)) {
        links.push(absoluteUrl); // Only keep links from the same domain
      }
    }
  });

  return links;
};

// Function to scrape content from a single page
const scrapePage = async (pageUrl, browser) => {
  const page = await browser.newPage();
  await page.goto(pageUrl, { waitUntil: 'domcontentloaded' });
  
  // Get the full HTML content of the page
  const pageContent = await page.content(); // Playwright fetches the full HTML
  console.log('Page content fetched from:', pageUrl); // Log the page URL
  
  // Log the full HTML content (for debugging purposes)
  console.log('Page HTML:', pageContent.substring(0, 1000)); // Show only the first 1000 characters for easier reading

  await page.close();
  return pageContent;
};

// Function to crawl the given URL and scrape all internal pages
const crawlAndScrape = async (startUrl, browser) => {
  const visited = new Set(); // To avoid revisiting the same page
  const toVisit = [startUrl]; // Pages to visit
  let scrapedContent = [];

  while (toVisit.length > 0) {
    const currentUrl = toVisit.pop();
    if (visited.has(currentUrl)) continue; // Skip already visited pages
    visited.add(currentUrl);
    
    try {
      console.log('Visiting:', currentUrl); // Log the URL being visited
      // Scrape the current page
      const pageContent = await scrapePage(currentUrl, browser);
      scrapedContent.push({ url: currentUrl, content: pageContent });

      // Get the internal links on this page
      const links = extractInternalLinks(currentUrl, pageContent, visited);

      console.log('Found links:', links); // Log the links found on the page

      // Add new links to the queue
      links.forEach(link => {
        if (!visited.has(link)) {
          toVisit.push(link);
        }
      });
    } catch (err) {
      console.error(`Error scraping page ${currentUrl}:`, err);
    }
  }

  return scrapedContent;
};

// Route to scrape content from the provided URL
app.post('/scrape', async (req, res) => {
  const { url: startUrl } = req.body;

  if (!startUrl) {
    return res.status(400).json({ error: 'URL is required' });
  }

  try {
    const browser = await playwright.chromium.launch();
    const scrapedContent = await crawlAndScrape(startUrl, browser);
    await browser.close();

    // Check if the content is an array and send it
    if (Array.isArray(scrapedContent)) {
      res.json({ scrapedContent });
    } else {
      res.json({ scrapedContent: [] }); // Return an empty array if scraping fails
    }
  } catch (error) {
    console.error('Error during scraping:', error);
    res.status(500).json({ error: 'Failed to scrape the URL. Please try again later.' });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
