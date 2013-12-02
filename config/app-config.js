var AppConfig = {}

AppConfig.videoInfoCache = {};
AppConfig.videoInfoCache.maxSizeBytes = 1048576; // 1MB should be more than enough
AppConfig.videoInfoCache.maxAgeMillis = 60000;   // 1 minute sounds about right

module.exports = AppConfig;