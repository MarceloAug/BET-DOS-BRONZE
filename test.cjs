const https = require('https');
const elos = ['challenger', 'diamond', 'emerald', 'gold', 'silver', 'bronze', 'iron'];
const checkUrl = (elo) => {
  const url = https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-static-assets/global/default/images/ranked-mini-crests/.png;
  https.request(url, { method: 'HEAD' }, (res) => {
    console.log(elo, res.statusCode);
  }).end();
}
elos.forEach(checkUrl);
