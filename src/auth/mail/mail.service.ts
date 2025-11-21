import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MailService {
    private transporter;
    private readonly logger = new Logger(MailService.name);

    constructor(private configService: ConfigService) {
        this.transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 587,
            secure: false, // TLS
            auth: {
                user: this.configService.get<string>('MAIL_USER'),
                pass: this.configService.get<string>('MAIL_PASS'),
            },
        });
    }

    async sendMail(to: string, subject: string, html: string) {
        const info = await this.transporter.sendMail({
        from: `"TechStore" <${this.configService.get<string>('MAIL_USER')}>`,
        to,
        subject,
        html,
        });

    this.logger.debug(`Correo enviado a ${to} (ID: ${info.messageId})`);
    return info;
}


    async sendVerificationEmail(to: string, token: string) {
    const baseUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000'; 
    const link = `${baseUrl.replace(/\/$/, '')}/auth/verify?token=${token}`; 

    const verificationHtml = `
    <div style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px; text-align: center;">
        <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
            <tr>
                <td align="center" style="padding: 25px 0; background-color: #3f51b5; border-top-left-radius: 8px; border-top-right-radius: 8px;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 28px;">TechStore 🛍️</h1>
                </td>
            </tr>
            <tr>
                <td style="padding: 40px 30px 20px 30px;">
                    <h2 style="color: #333333; margin-top: 0; font-size: 24px;">¡Bienvenido/a a la comunidad!</h2>
                    <p style="color: #555555; line-height: 1.6; font-size: 16px;">Gracias por registrarte. Para completar la configuración de tu cuenta, haz clic en el botón de abajo:</p>
                    
                    <table border="0" cellspacing="0" cellpadding="0" style="margin: 30px auto;">
                        <tr>
                            <td align="center" style="border-radius: 6px;" bgcolor="#28a745">
                                <a href="${link}" target="_blank" style="font-size: 18px; font-family: Arial, sans-serif; color: #ffffff; text-decoration: none; border-radius: 6px; padding: 14px 30px; border: 1px solid #28a745; display: inline-block; font-weight: bold;">
                                    Verificar Cuenta
                                </a>
                            </td>
                        </tr>
                    </table>

                    <p style="color: #555555; line-height: 1.6; font-size: 14px;">Si el botón no funciona, copia y pega el siguiente enlace:</p>
                    <p style="color: #3f51b5; font-size: 13px; word-break: break-all; padding: 10px; background-color: #f0f0f0; border-radius: 4px;">${link}</p>
                </td>
            </tr>
            <tr>
                <td align="center" style="padding: 20px; color: #999999; font-size: 12px; border-top: 1px solid #eeeeee;">
                    <p style="margin: 0;">Si no te registraste, puedes ignorar este correo.</p>
                    &copy; ${new Date().getFullYear()} TechStore.
                </td>
            </tr>
        </table>
    </div>
    `;

    return this.sendMail(
        to,
        'Verifica tu cuenta | TechStore',
        verificationHtml,
    );
}

async sendPasswordResetEmail(to: string, token: string) {
    const baseUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    const link = `${baseUrl.replace(/\/$/, '')}/auth/reset-password?token=${token}`; 
    
    const resetHtml = `
    <div style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px; text-align: center;">
        <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
            <tr>
                <td align="center" style="padding: 25px 0; background-color: #f7931e; border-top-left-radius: 8px; border-top-right-radius: 8px;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 28px;">Restablecer Contraseña</h1>
                </td>
            </tr>
            <tr>
                <td style="padding: 40px 30px 20px 30px;">
                    <h2 style="color: #333333; margin-top: 0; font-size: 24px;">Solicitud de Recuperación</h2>
                    <p style="color: #555555; line-height: 1.6; font-size: 16px;">Recibimos una solicitud para restablecer la contraseña de tu cuenta. Si no hiciste esta solicitud, puedes ignorar este correo.</p>
                    <p style="color: #CC0000; font-weight: bold; font-size: 14px;">Este enlace expirará en 20 minutos.</p>
                    
                    <table border="0" cellspacing="0" cellpadding="0" style="margin: 30px auto;">
                        <tr>
                            <td align="center" style="border-radius: 6px;" bgcolor="#f7931e">
                                <a href="${link}" target="_blank" style="font-size: 18px; font-family: Arial, sans-serif; color: #ffffff; text-decoration: none; border-radius: 6px; padding: 14px 30px; border: 1px solid #f7931e; display: inline-block; font-weight: bold;">
                                    Restablecer Contraseña
                                </a>
                            </td>
                        </tr>
                    </table>

                    <p style="color: #555555; line-height: 1.6; font-size: 14px;">Si el botón no funciona, copia y pega el siguiente enlace:</p>
                    <p style="color: #f7931e; font-size: 13px; word-break: break-all; padding: 10px; background-color: #f0f0f0; border-radius: 4px;">${link}</p>
                </td>
            </tr>
            <tr>
                <td align="center" style="padding: 20px; color: #999999; font-size: 12px; border-top: 1px solid #eeeeee;">
                    <p style="margin: 0;">Si tienes problemas, contacta a soporte.</p>
                    &copy; ${new Date().getFullYear()} TechStore.
                </td>
            </tr>
        </table>
    </div>
    `;

    return this.sendMail(
        to,
        'Restablece tu contraseña | TechStore',
        resetHtml,
    );
}
}
