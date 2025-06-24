<?php
header('Content-Type: application/json');
$apiKey = "YOUR_API_KEY";
$q = urlencode($_GET['q'] ?? '');
$url = "https://www.googleapis.com/youtube/v3/search?part=snippet&q={$q}+music&type=video&maxResults=10&key={$apiKey}";
echo file_get_contents($url);