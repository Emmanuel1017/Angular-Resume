export interface IAbout {
    internationalizations: IAboutInternationalization[];
    medias?: IAboutMedia[];
    hobbies?: IAboutHobby[];
}

export interface IAboutInternationalization {
    language: string;
    description: string;
}

export interface IAboutMedia {
    icon: string; // (https://www.w3schools.com/icons/fontawesome_icons_brand.asp)
    title: string;
    http: string;
}

export interface IAboutHobby {
    icon: string; // (https://www.w3schools.com/icons/fontawesome_icons_brand.asp)
    title: string;
}
