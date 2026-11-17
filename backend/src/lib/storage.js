const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');

/**
 * S3-compatible object storage (Neon Object Storage in production).
 * When the storage env vars are absent (e.g. a plain local checkout), callers
 * fall back to the on-disk uploads directory.
 */
const BUCKET = process.env.S3_BUCKET || process.env.AWS_BUCKET_NAME || '';

let client = null;

const getClient = () => {
  if (client) return client;

  client = new S3Client({
    region: process.env.AWS_REGION || 'us-east-2',
    endpoint: process.env.AWS_ENDPOINT_URL_S3,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    },
    // Neon Object Storage requires path-style addressing and only wants
    // checksum headers when an operation demands them.
    forcePathStyle: true,
    requestChecksumCalculation: 'WHEN_REQUIRED'
  });

  return client;
};

const isConfigured = () =>
  Boolean(
    BUCKET &&
      process.env.AWS_ENDPOINT_URL_S3 &&
      process.env.AWS_ACCESS_KEY_ID &&
      process.env.AWS_SECRET_ACCESS_KEY
  );

const buildObjectKey = ({ userId, ext, stamp = Date.now(), rand = Math.random().toString(36).slice(2, 10) }) =>
  `${userId}/${stamp}-${rand}${ext}`;

const putObject = async ({ key, body, contentType }) => {
  await getClient().send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType
    })
  );
  return key;
};

const getObjectStream = async (key) =>
  getClient().send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));

const deleteObject = async (key) => {
  if (!key) return;
  await getClient().send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
};

const isObjectMissing = (error) =>
  error?.name === 'NoSuchKey' ||
  error?.name === 'NotFound' ||
  error?.$metadata?.httpStatusCode === 404;

module.exports = {
  BUCKET,
  isConfigured,
  buildObjectKey,
  putObject,
  getObjectStream,
  deleteObject,
  isObjectMissing
};
