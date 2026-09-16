const swaggerAutogen = require('swagger-autogen')();

const doc = {
  info: {
    title: 'SOAR System n8n VirusTotal API',
    description: 'He thong REST API tu dong hoa phan tich moi de doa ma doc qua n8n va VirusTotal'
  },
  host: 'localhost:3000',
  schemes: ['http']
};

const outputFile = './swagger.json';
const endpointsFiles = ['./server.js'];

swaggerAutogen(outputFile, endpointsFiles, doc);
