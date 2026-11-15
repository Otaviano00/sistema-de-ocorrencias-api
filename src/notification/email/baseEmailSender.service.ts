import { Injectable } from "@nestjs/common";

@Injectable()
export abstract class BaseEmailSender {
    abstract send(to: string, message: string): Promise<void>;
}