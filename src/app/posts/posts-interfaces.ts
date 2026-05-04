export interface IPostI18n {
    language: string;
    title: string;
    description: string;
    content?: string;
}

export interface IPost {
    thumbnail: string;
    http: string;
    date: string; // For the purpose of stringifying MM-DD-YYYY date format
    internationalizations: IPostI18n[];
    // runtime-resolved by internationalization directive:
    title?: string;
    description?: string;
}
