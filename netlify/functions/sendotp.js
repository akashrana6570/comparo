const https = require('https');

exports.handler = async (event) => {
  const { email, name, otp } = JSON.parse(event.body);

  const payload = JSON.stringify({
    service_id: 'service_gjcasld',
    template_id: 'template_pbxpqg4',
    user_id: '0ra58-BTu4ENry2VB',
    template_params: { to_email: email, to_name: name, otp_code: otp }
  });

  return new Promise((resolve) => {
    const req = https.request({
      hostname: 'api.emailjs.com',
      path: '/api/v1.0/email/send',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({
        statusCode: res.statusCode,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: data
      }));
    });
    req.on('error', (e) => resolve({ statusCode: 500, body: e.message }));
    req.write(payload);
    req.end();
  });
};
