# Sähköpostiasetukset

SabaTilasto käyttää nodemailer-kirjastoa salasanan palautussähköpostien lähettämiseen.

## .env-tiedoston asetukset

Lisää `.env`-tiedostoon seuraavat rivit:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=SabaTilasto <noreply@sabatilasto.fi>
```

## Gmail-asetukset

Jos käytät Gmailia, sinun täytyy luoda sovellussalasana (App Password):

1. Mene Google-tilisi asetuksiin: https://myaccount.google.com/
2. Valitse **Turvallisuus**
3. Ota käyttöön **Kaksivaiheinen tunnistautuminen** (jos ei ole jo käytössä)
4. Hae "Sovellussalasanat" tai mene suoraan: https://myaccount.google.com/apppasswords
5. Luo uusi sovellussalasana valitsemalla:
   - App: "Mail" tai "Other (Custom name)"
   - Kirjoita nimi: "SabaTilasto"
6. Kopioi 16-merkkinen salasana ja aseta se `SMTP_PASS`-muuttujaan (ilman välilyöntejä)

## Muut sähköpostipalvelut

### Outlook/Hotmail
```env
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_USER=your-email@outlook.com
SMTP_PASS=your-password
```

### Yahoo
```env
SMTP_HOST=smtp.mail.yahoo.com
SMTP_PORT=587
SMTP_USER=your-email@yahoo.com
SMTP_PASS=your-app-password
```

### Custom SMTP
Voit käyttää mitä tahansa SMTP-palvelua päivittämällä vastaavat asetukset.

## Testaus

Kun asetukset on tehty:

1. Käynnistä dev-serveri uudelleen: `npm run dev`
2. Mene sovellukseen ja klikkaa "Kirjaudu sisään"
3. Klikkaa "Unohditko salasanan?"
4. Syötä käyttäjätunnus
5. Tarkista sähköpostisi

## Vianmääritys

Jos sähköpostit eivät lähetä:

1. Tarkista että `.env`-tiedostossa on kaikki vaaditut muuttujat
2. Varmista että dev-serveri on käynnistetty uudelleen muutosten jälkeen
3. Tarkista konsoli virheviestejä varten
4. Gmail-käyttäjät: varmista että käytät sovellussalasanaa, ei tavallista salasanaa
5. Tarkista että portti 587 ei ole palomuurin estämä

## Tuotanto-asetukset

Tuotannossa voit käyttää:
- Oman palvelimen SMTP-palvelua
- SendGrid (https://sendgrid.com/)
- AWS SES (https://aws.amazon.com/ses/)
- Mailgun (https://www.mailgun.com/)
- Muita sähköpostipalveluita

Päivitä vain `.env`-tiedoston SMTP-asetukset vastaavasti.
