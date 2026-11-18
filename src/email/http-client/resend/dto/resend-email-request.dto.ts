export class ResendEmailRequestDTO {
  from: string;
  to: string[];
  subject: string;
  html: string;
}
