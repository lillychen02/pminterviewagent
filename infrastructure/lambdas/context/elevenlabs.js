const AWS = require('aws-sdk');
const axios = require('axios');

class ElevenLabsService {
  constructor() {
    this.secretsManager = new AWS.SecretsManager();
    this.apiKey = null;
    this.baseUrl = 'https://api.elevenlabs.io/v1';
  }

  async initialize() {
    if (!this.apiKey) {
      const secretResponse = await this.secretsManager.getSecretValue({
        SecretId: process.env.ELEVENLABS_API_KEY_SECRET_ARN
      }).promise();
      
      const { apiKey } = JSON.parse(secretResponse.SecretString);
      this.apiKey = apiKey;
    }
  }

  async textToSpeech(text, voiceId = 'pNInz6obpgDQGcFmaJgB') { // Adam voice ID
    await this.initialize();

    const response = await axios({
      method: 'post',
      url: `${this.baseUrl}/text-to-speech/${voiceId}`,
      headers: {
        'Accept': 'audio/mpeg',
        'xi-api-key': this.apiKey,
        'Content-Type': 'application/json'
      },
      data: {
        text,
        model_id: 'eleven_monolingual_v1',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75
        }
      },
      responseType: 'arraybuffer'
    });

    return response.data;
  }

  async speechToText(audioBuffer) {
    await this.initialize();

    const response = await axios({
      method: 'post',
      url: `${this.baseUrl}/speech-to-text`,
      headers: {
        'Accept': 'application/json',
        'xi-api-key': this.apiKey,
        'Content-Type': 'audio/mpeg'
      },
      data: audioBuffer
    });

    return response.data.text;
  }
}

module.exports = ElevenLabsService; 