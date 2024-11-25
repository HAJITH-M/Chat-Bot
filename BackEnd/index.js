const express = require('express');
const axios = require('axios');
const puppeteer = require('puppeteer');
const url = require('url'); // To parse URLs
const cors = require('cors');

const app = express();
const port = 5000;

app.use(cors());
app.use(express.json());

// Utility function to resolve relative URLs
const resolveUrl = (base, relative) => {
  return url.resolve(base, relative);
};

// Function to extract all internal links from the page
const getLinksFromPage = async (page) => {
  return await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll('a'));
    return links
      .map((link) => link.href)
      .filter((href) => href && href.startsWith(window.location.origin)); // Only internal links
  });
};

// Function to scrape content (you can adjust the selector as needed)
const scrapePageContent = async (page) => {
  return await page.evaluate(() => {
    const paragraphs = Array.from(document.querySelectorAll('p')); // Change to target different elements
    return paragraphs.map(p => p.innerText).join('\n');
  });
};

app.post('/scrape', async (req, res) => {
  const { url: targetUrl } = req.body;
  console.log(`Starting scrape on: ${targetUrl}`);

  try {
    // Launch Puppeteer browser instance
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    
    // Go to the provided URL
    await page.goto(targetUrl, { waitUntil: 'networkidle2' });

    // Get all the links from the main page
    const links = await getLinksFromPage(page);
    console.log('Found links:', links);

    // Initialize array to hold all content and set to track visited URLs
    let allContent = [];
    let visited = new Set(); // To track already visited links

    // Scrape the main page content
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
          
          // Scrape content from this new page
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
      return res.status(200).json({ content: ['No content found on the pages.'] });
    }

    res.json({ content: allContent });

  } catch (error) {
    console.error('Error during scraping:', error);
    res.status(500).json({ content: ['Error occurred while scraping the site.'] });
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
