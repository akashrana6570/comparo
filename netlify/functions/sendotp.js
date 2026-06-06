exports.handler = async (event) => {
  const { email, name, otp } = JSON.parse(event.body);

  const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      service_id: 'service_gjcasld',
      template_id: 'template_pbxpqg4',
      user_id: '0ra58-BTu4ENry2VB',
      template_params: { to_email: email, to_name: name, otp_code: otp }
    })
  });

  const text = await response.text();
  return {
    statusCode: response.status,
    body: text
  };
};
