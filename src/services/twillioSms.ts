
import twilio from 'twilio';

export const sendSms = async (data: any) => {
    const accountSid = process.env.asAbove;
    const authToken = process.env.asAbove;
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