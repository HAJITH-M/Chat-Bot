const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const url = require('url'); // To parse URLs
const cors = require('cors');

// Enable Puppeteer Stealth Plugin to bypass detection
puppeteer.use(StealthPlugin());

const app = express();
const port = 5000;

app.use(cors()); 
app.use(express.json());

// Utility function to resolve relative URLs to absolute
const resolveUrl = (base, relative) => {
  return url.resolve(base, relative);
};

// Function to extract all internal links from the page
const getLinksFromPage = async (page) => {
  return await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll('a'));
    // Debug: Print all links to the console to check which links are being picked up
    console.log("Extracted links from the page: ", links.map(link => link.href));
    return links
      .map((link) => link.href)
      .filter((href) => href && href.startsWith(window.location.origin)); // Only internal links
  });
};

// Function to scrape the text content of the page
const scrapePageContent = async (page) => {
  try {
    // Wait for the body element to load (wait for some visible content like a header or specific section)
    await page.waitForSelector('body', { timeout: 60000 });

    // Grab all text content from the body of the page
    return await page.evaluate(() => {
      const bodyContent = document.body.innerText; // Grabbing text from all visible tags
      return bodyContent;
    });
  } catch (error) {
    console.error('Error: Content did not load in time or could not be extracted.', error);
    return '';  // Return empty if content extraction fails
  }
};

app.post('/scrape', async (req, res) => {
  const { url: targetUrl } = req.body;
  console.log(`Starting scrape on: ${targetUrl}`);

  try {
    // Launch Puppeteer browser instance with Stealth Plugin and updated launch options
    const browser = await puppeteer.launch({
      headless: false, // Change this to false for debugging
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      slowMo: 50, // Slow down the browser to make debugging easier
    });
    const page = await browser.newPage();

    // Set a User-Agent to simulate a real browser
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

    // Go to the provided URL and wait for the content to load
    await page.goto(targetUrl, { waitUntil: 'networkidle2' });
    await page.waitForSelector('body');  // Wait for body tag to load

    // Scrape all internal links from the page
    let links = await getLinksFromPage(page);
    console.log('Found links:', links);

    // Initialize array to hold all content and set to track visited URLs
    let allContent = [];
    let visited = new Set(); // To track already visited links

    // Scrape the main page content (all text from the body)
    const mainPageContent = await scrapePageContent(page);
    allContent.push(mainPageContent);

    // Visit each internal link and scrape content
    for (let link of links) {
      if (!visited.has(link)) {
        visited.add(link);

        // Resolve relative URLs
        const absoluteLink = resolveUrl(targetUrl, link);

        // Check if the link belongs to the same domain as the target URL
        const parsedLink = url.parse(absoluteLink);
        if (parsedLink.hostname === url.parse(targetUrl).hostname) {
          const newPage = await browser.newPage();
          await newPage.goto(absoluteLink, { waitUntil: 'networkidle2' });

          // Scrape content from this new page (all text from the body)
          const pageContent = await scrapePageContent(newPage);
          allContent.push(pageContent);

          await newPage.close(); // Close the page after scraping
        }
      }
    }

    // Close the browser
    await browser.close();

    // Return the scraped content
    if (allContent.length === 0) {
      console.log('No content found on the pages.');
      return res.status(200).json({ content: ['No content found on the pages.'] });
    }

    res.json({ content: allContent });

  } catch (error) {
    console.error('Error during scraping:', error.message); // Log the error message
    console.error(error.stack); // Log the full stack trace to get more context

    // Send a more specific error message
    res.status(500).json({ content: ['Error occurred while scraping the site.'] });
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
