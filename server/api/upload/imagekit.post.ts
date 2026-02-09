import ImageKit, { toFile } from "@imagekit/nodejs";

export default defineEventHandler(async (event) => {
    const config = useRuntimeConfig();

    // @ts-ignore: Type definition might be mismatching with actual implementation
  const imagekit = new ImageKit({
      privateKey: config.imagekitPrivateKey as string,
  });

    const files = await readMultipartFormData(event);

    if (!files || files.length === 0) {
        throw createError({
            statusCode: 400,
            statusMessage: "No file uploaded",
        });
    }

    // Find the file field (assuming field name is 'file')
    const file = files.find(f => f.name === 'file');

    if (!file) {
        throw createError({
            statusCode: 400,
            statusMessage: "Field 'file' missing in form data"
        });
  }

  try {
      const response = await imagekit.files.upload({
          file: await toFile(Buffer.from(file.data), 'file'), // readMultipartFormData returns Buffer in .data
          fileName: file.filename || "upload_" + Date.now(),
          folder: "/unitproject-coupon/registration/"
      });

      return {
          url: response.url,
          fileId: response.fileId,
          name: response.name,
      };
  } catch (error: any) {
      console.error("ImageKit upload error:", error);
      throw createError({
          statusCode: 500,
          statusMessage: "Failed to upload image to ImageKit",
      });
  }
});