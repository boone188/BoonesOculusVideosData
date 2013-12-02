// Required modules
var express = require('express');
var AWS = require('aws-sdk');
var LRU = require("lru-cache");
var AppConfig = require("./config/app-config");

// Create DynamoDB client
AWS.config.loadFromPath('./config/aws-config.json');
var dynamodb = new AWS.DynamoDB();

// Create the LRU cache
var videoInfoCacheOptions = { 
        max: AppConfig.videoInfoCache.maxSizeBytes, 
        length: function (n) { return Buffer.byteLength(n, 'utf8') },
        maxAge: AppConfig.videoInfoCache.maxAgeMillis };
        
var videoInfoCache = LRU(videoInfoCacheOptions);

// Create the app
var app = express();

// I love logging
app.use(express.logger('dev'));

app.use(app.router);

// I speak exclusively JSON
app.use(function(req, res, next) {
    res.type('application/json');
    next();
});

// Handle 404
app.use(function(req, res) {
    res.send(404, {status:404, message: 'resource not found', type:'not-found'});
});

// Handle 500
app.use(function(error, req, res, next) {
    console.log(error);
    res.send(500, {status:500, message: 'internal error', type:'internal'});
});
  
// This is what it's all about! Gets the sorted video info in JSON.
app.get("/videos", function(req, res) {
    
    // Default to hot if no sort specified
    var sort = req.query.sort;
    if (typeof sort === 'undefined') {
        sort = 'hot';
    }
    
    // Default to week if no time specified
    var time = req.query.time;
    if (typeof time === 'undefined') {
        time = 'week';
    }
    
    var sort_type = 'sort=' + sort + '&time=' + time;
    
    // Try the cache firt
    var videoInfo = videoInfoCache.get(sort_type);
    
    // If it was in the cache, that's great. Return the result.
    if (typeof videoInfo !== 'undefined' && videoInfo) {
        // Return the video info
        res.end(videoInfo);
    }
    else {
        // If it wasn't in the cache, we need to get it from Dynamo
        
        // Dynamo request params
        var params = {
            AttributesToGet: [
                'video_info'
            ],
            TableName : 'hot_oculus_videos',
            Key : { 
                'sort_type' : {
                    'S' : sort_type
                }
            }
        };
      
        // Call Dynamo
        dynamodb.getItem(params, function(err, data) {
            if (err) {
                console.log(err); // log error
            } 
            else {
                // Success!
                videoInfo = data.Item.video_info.S;
                
                // Return the video info
                res.end(videoInfo);
                
                videoInfoCache.set(sort_type, videoInfo); // put into cache
            }
        });
    }
});

app.listen(process.env.PORT, process.env.IP);