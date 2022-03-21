require("dotenv").config();
const express = require("express");
const cors = require("cors");
const app = express();
const bodyParser = require("body-parser");
const shortId = require("shortid");
const validUrl = require("valid-url");
const { log } = require("console");

/** Set up mongoose */
let mongoose;
try {
  mongoose = require("mongoose");
} catch (err) {
  console.log(err);
}
mongoose.connect(process.env.MONGO_URI);

/** Create a 'URL' Model */
const urlSchema = new mongoose.Schema({
  original_url: String,
  short_url: String,
});

/** Create the URL model */
const URL = mongoose.model("URL", urlSchema);

// Basic Configuration
const port = process.env.PORT || 3000;

// ENABLE CORS FOR TESTING PURPOSES
app.use(cors({ optionsSuccessStatus: 200 }));

app.use(bodyParser.urlencoded({ extended: false }));

app.use(bodyParser.json());

// ENABLE USE OF STATIC FILES
app.use("/public", express.static(__dirname + "/public"));

// LOG REQUEST INFORMATION
app.use((req, res, next) => {
  log(`${req.method} ${req.path} - ${req.ip}`);
  next();
});

// HOME PAGE ROUTING
app.get("/", (req, res) => {
  const absolutePath = __dirname + "/views/index.html";
  res.sendFile(absolutePath);
});

// shorurl API endpoint
app.post("/api/shorturl", async function (req, res) {
  const { url } = req.body;
  if (!validUrl.isUri(url)) {
    res.status(401).json({
      error: "Invalid Url",
    });
  } else {
    try {
      // Check if the url is already in th db
      let urlEntry = await URL.findOne({
        original_url: url,
      });

      if (urlEntry) {
        return res.json({
          original_url: urlEntry.original_url,
          short_url: urlEntry.short_url,
        });
      } else {
        // If the url is not been already shortened, then create a new entry
        // on the db and response with the result
        const short_url = shortId.generate();
        urlEntry = new URL({
          original_url: url,
          short_url,
        });
        await urlEntry.save();
        res.json({
          original_url: url,
          short_url,
        });
      }
    } catch (err) {
      log(err);
      res.status(500).json("Server error...");
    }
  }
});

// Redirect shorturl to original url
app.get("/api/shorturl/:short_url", async function (req, res) {
  try {
    const urlFromDB = await URL.findOne({
      short_url: req.params.short_url,
    });
    if (urlFromDB) {
      return res.redirect(urlFromDB.original_url);
    } else {
      return res.status(404).json("No URL found");
    }
  } catch (err) {
    log(err);
    res.status(500).json("Server Error");
  }
});

app.listen(port, function () {
  log(`Listening on port ${port}`);
});
