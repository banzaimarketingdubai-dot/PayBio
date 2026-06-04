declare module 'exif-parser' {
  export interface ExifResult {
    tags: {
      Software?: string;
      ModifyDate?: string;
      [key: string]: any;
    };
    imageSize: {
      width: number;
      height: number;
    };
  }

  export interface ExifParserInstance {
    parse(): ExifResult;
  }

  export function create(buffer: Buffer): ExifParserInstance;
}
