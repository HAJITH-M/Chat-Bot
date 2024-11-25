const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const cors = require('cors');
const puppeteer = require('puppeteer');

const app = express();
const port = 5000;

app.use(cors());  // Enable CORS for all requests
app.use(express.json()); // Parse incoming JSON requests

app.post('/scrape', async (req, res) => {
    const { url } = req.body;
    console.log(`Scraping URL: ${url}`);
  
    try {
      // Launch Puppeteer and navigate to the URL
      const browser = await puppeteer.launch();
      const page = await browser.newPage();
      await page.goto(url, { waitUntil: 'networkidle0' }); // Wait until the page is fully loaded
  
      // Extract the content using Puppeteer
      const content = await page.evaluate(() => {
        // Example: Scraping <p> tags (modify selector if needed)
        const paragraphs = Array.from(document.querySelectorAll('p'));
        return paragraphs.map(p => p.innerText); // Extract text from each <p> element
      });
  
      await browser.close();
  
      if (content.length === 0) {
        return res.status(200).json({ content: ['No content found on the page.'] });
      }
  
      res.json({ content });
    } catch (error) {
      console.error('Error during scraping:', error);
      res.status(500).json({ content: ['Error occurred while scraping the site.'] });
    }
  });

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
