
import twilio from 'twilio';

export const sendSms = async (data: any) => {
    const accountSid = 'AC8fca955b42f15e413911059148557bc8;
    const authToken = 'e0c75ee5b36790c3f934d46f13521346';
    const client = twilio(accountSid, authToken);

    const sendMsg = await client.messages.create({
        body: `Your OTP code is: ${data.otp}`,
        from: '+15076269107', // Your Twilio phone number
        to: data.phoneNumber,
    });

    if (!sendMsg) {
        return false;
    }
    return true
}
