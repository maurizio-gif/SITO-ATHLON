/**
 * I prefissi telefonici internazionali, per i campi «cellulare» di tutti i form.
 *
 * ## Il problema che risolve
 *
 * Fino a ieri i form chiedevano il numero senza prefisso e il codice incollava
 * `+39` davanti a quello che la persona aveva scritto. Funzionava per chi
 * scriveva `320…` e si rompeva in due modi opposti: chi scriveva `+39 320…`
 * finiva con `+39+39320…`, e chi ha un numero straniero non poteva essere
 * raggiunto affatto — il suo `+44 7…` diventava `+39447…`, che è un numero
 * italiano che non esiste.
 *
 * Con la tendina il prefisso è un dato scelto, non indovinato, e il numero che
 * arriva ad Airtable, a Spoki e a PerfectGym è sempre in forma E.164: `+`,
 * prefisso, numero, senza spazi.
 *
 * ## Come è fatta la lista
 *
 * Sono i codici paese ITU-T E.164. Due cose non ovvie:
 *
 * - **Più paesi condividono lo stesso codice.** `+1` è Stati Uniti, Canada e
 *   venti Caraibi; `+7` è Russia e Kazakistan; `+39` è Italia e Città del
 *   Vaticano. La tendina li elenca separatamente perché una persona cerca il suo
 *   paese, non il suo numero — ma il valore che esce è lo stesso, ed è giusto
 *   così: al telefono quei paesi *sono* lo stesso spazio di numerazione.
 * - **Il valore della `<option>` è il solo codice**, non l'indice: se un giorno
 *   la lista si riordina, i dati già raccolti restano leggibili.
 *
 * L'Italia è in testa e preselezionata, e non per campanilismo: il club è a
 * Roma, la quasi totalità dei numeri è italiana, e un menu che parte dal paese
 * giusto è un menu che nessuno deve aprire.
 *
 * Per verificare un codice: `https://www.itu.int/pub/T-SP-E.164D` è la lista
 * ufficiale. **Un prefisso sbagliato non dà errore**: manda un WhatsApp a un
 * numero che non esiste, e non lo si scopre mai.
 */

export interface Prefisso {
  /** Il nome del paese, in italiano: è quello che la persona cerca. */
  paese: string;
  /** Il codice, col `+`. Più paesi possono averlo uguale. */
  codice: string;
  /** ISO 3166-1 alpha-2, per la bandiera e per distinguere paesi con lo stesso codice. */
  iso: string;
}

/** Il preselezionato. */
export const PREFISSO_PREDEFINITO = '+39';

/**
 * La bandiera come emoji, calcolata dall'ISO invece di essere scritta a mano.
 *
 * Due lettere maiuscole diventano due «regional indicator symbols»
 * (U+1F1E6 è A), e il browser le disegna come bandiera. Duecento emoji scritte
 * a mano sarebbero duecento occasioni di appaiare la bandiera sbagliata al
 * paese; questa funzione non può sbagliare, perché deriva l'una dall'altro.
 *
 * Su Windows le bandiere **non si disegnano** — il font di sistema non le ha, e
 * si vedono le due lettere. Va bene: due lettere accanto al nome del paese sono
 * informative comunque, ed è il motivo per cui la tendina non conta sulla
 * bandiera per farsi capire.
 */
export function bandiera(iso: string): string {
  return String.fromCodePoint(
    ...iso
      .toUpperCase()
      .split('')
      .map((c) => 0x1f1e6 + c.charCodeAt(0) - 65)
  );
}

/**
 * Tutti i paesi, in ordine alfabetico italiano. L'Italia compare anche qui,
 * oltre che in testa alla tendina: chi scorre l'elenco alla lettera I se
 * l'aspetta.
 */
export const PREFISSI: Prefisso[] = [
  { paese: 'Afghanistan', codice: '+93', iso: 'AF' },
  { paese: 'Albania', codice: '+355', iso: 'AL' },
  { paese: 'Algeria', codice: '+213', iso: 'DZ' },
  { paese: 'Andorra', codice: '+376', iso: 'AD' },
  { paese: 'Angola', codice: '+244', iso: 'AO' },
  { paese: 'Anguilla', codice: '+1', iso: 'AI' },
  { paese: 'Antigua e Barbuda', codice: '+1', iso: 'AG' },
  { paese: 'Arabia Saudita', codice: '+966', iso: 'SA' },
  { paese: 'Argentina', codice: '+54', iso: 'AR' },
  { paese: 'Armenia', codice: '+374', iso: 'AM' },
  { paese: 'Aruba', codice: '+297', iso: 'AW' },
  { paese: 'Australia', codice: '+61', iso: 'AU' },
  { paese: 'Austria', codice: '+43', iso: 'AT' },
  { paese: 'Azerbaigian', codice: '+994', iso: 'AZ' },
  { paese: 'Bahamas', codice: '+1', iso: 'BS' },
  { paese: 'Bahrein', codice: '+973', iso: 'BH' },
  { paese: 'Bangladesh', codice: '+880', iso: 'BD' },
  { paese: 'Barbados', codice: '+1', iso: 'BB' },
  { paese: 'Belgio', codice: '+32', iso: 'BE' },
  { paese: 'Belize', codice: '+501', iso: 'BZ' },
  { paese: 'Benin', codice: '+229', iso: 'BJ' },
  { paese: 'Bermuda', codice: '+1', iso: 'BM' },
  { paese: 'Bhutan', codice: '+975', iso: 'BT' },
  { paese: 'Bielorussia', codice: '+375', iso: 'BY' },
  { paese: 'Bolivia', codice: '+591', iso: 'BO' },
  { paese: 'Bosnia ed Erzegovina', codice: '+387', iso: 'BA' },
  { paese: 'Botswana', codice: '+267', iso: 'BW' },
  { paese: 'Brasile', codice: '+55', iso: 'BR' },
  { paese: 'Brunei', codice: '+673', iso: 'BN' },
  { paese: 'Bulgaria', codice: '+359', iso: 'BG' },
  { paese: 'Burkina Faso', codice: '+226', iso: 'BF' },
  { paese: 'Burundi', codice: '+257', iso: 'BI' },
  { paese: 'Cambogia', codice: '+855', iso: 'KH' },
  { paese: 'Camerun', codice: '+237', iso: 'CM' },
  { paese: 'Canada', codice: '+1', iso: 'CA' },
  { paese: 'Capo Verde', codice: '+238', iso: 'CV' },
  { paese: 'Ciad', codice: '+235', iso: 'TD' },
  { paese: 'Cile', codice: '+56', iso: 'CL' },
  { paese: 'Cina', codice: '+86', iso: 'CN' },
  { paese: 'Cipro', codice: '+357', iso: 'CY' },
  { paese: 'Città del Vaticano', codice: '+39', iso: 'VA' },
  { paese: 'Colombia', codice: '+57', iso: 'CO' },
  { paese: 'Comore', codice: '+269', iso: 'KM' },
  { paese: 'Congo', codice: '+242', iso: 'CG' },
  { paese: 'Congo (Rep. Dem.)', codice: '+243', iso: 'CD' },
  { paese: 'Corea del Nord', codice: '+850', iso: 'KP' },
  { paese: 'Corea del Sud', codice: '+82', iso: 'KR' },
  { paese: "Costa d'Avorio", codice: '+225', iso: 'CI' },
  { paese: 'Costa Rica', codice: '+506', iso: 'CR' },
  { paese: 'Croazia', codice: '+385', iso: 'HR' },
  { paese: 'Cuba', codice: '+53', iso: 'CU' },
  { paese: 'Curaçao', codice: '+599', iso: 'CW' },
  { paese: 'Danimarca', codice: '+45', iso: 'DK' },
  { paese: 'Dominica', codice: '+1', iso: 'DM' },
  { paese: 'Ecuador', codice: '+593', iso: 'EC' },
  { paese: 'Egitto', codice: '+20', iso: 'EG' },
  { paese: 'El Salvador', codice: '+503', iso: 'SV' },
  { paese: 'Emirati Arabi Uniti', codice: '+971', iso: 'AE' },
  { paese: 'Eritrea', codice: '+291', iso: 'ER' },
  { paese: 'Estonia', codice: '+372', iso: 'EE' },
  { paese: 'Eswatini', codice: '+268', iso: 'SZ' },
  { paese: 'Etiopia', codice: '+251', iso: 'ET' },
  { paese: 'Figi', codice: '+679', iso: 'FJ' },
  { paese: 'Filippine', codice: '+63', iso: 'PH' },
  { paese: 'Finlandia', codice: '+358', iso: 'FI' },
  { paese: 'Francia', codice: '+33', iso: 'FR' },
  { paese: 'Gabon', codice: '+241', iso: 'GA' },
  { paese: 'Gambia', codice: '+220', iso: 'GM' },
  { paese: 'Georgia', codice: '+995', iso: 'GE' },
  { paese: 'Germania', codice: '+49', iso: 'DE' },
  { paese: 'Ghana', codice: '+233', iso: 'GH' },
  { paese: 'Giamaica', codice: '+1', iso: 'JM' },
  { paese: 'Giappone', codice: '+81', iso: 'JP' },
  { paese: 'Gibilterra', codice: '+350', iso: 'GI' },
  { paese: 'Gibuti', codice: '+253', iso: 'DJ' },
  { paese: 'Giordania', codice: '+962', iso: 'JO' },
  { paese: 'Grecia', codice: '+30', iso: 'GR' },
  { paese: 'Grenada', codice: '+1', iso: 'GD' },
  { paese: 'Groenlandia', codice: '+299', iso: 'GL' },
  { paese: 'Guatemala', codice: '+502', iso: 'GT' },
  { paese: 'Guernsey', codice: '+44', iso: 'GG' },
  { paese: 'Guinea', codice: '+224', iso: 'GN' },
  { paese: 'Guinea equatoriale', codice: '+240', iso: 'GQ' },
  { paese: 'Guinea-Bissau', codice: '+245', iso: 'GW' },
  { paese: 'Guyana', codice: '+592', iso: 'GY' },
  { paese: 'Haiti', codice: '+509', iso: 'HT' },
  { paese: 'Honduras', codice: '+504', iso: 'HN' },
  { paese: 'Hong Kong', codice: '+852', iso: 'HK' },
  { paese: 'India', codice: '+91', iso: 'IN' },
  { paese: 'Indonesia', codice: '+62', iso: 'ID' },
  { paese: 'Iran', codice: '+98', iso: 'IR' },
  { paese: 'Iraq', codice: '+964', iso: 'IQ' },
  { paese: 'Irlanda', codice: '+353', iso: 'IE' },
  { paese: 'Islanda', codice: '+354', iso: 'IS' },
  { paese: 'Isola di Man', codice: '+44', iso: 'IM' },
  { paese: 'Isole Cayman', codice: '+1', iso: 'KY' },
  { paese: 'Isole Cook', codice: '+682', iso: 'CK' },
  { paese: 'Isole Faroe', codice: '+298', iso: 'FO' },
  { paese: 'Isole Marshall', codice: '+692', iso: 'MH' },
  { paese: 'Isole Salomone', codice: '+677', iso: 'SB' },
  { paese: 'Isole Turks e Caicos', codice: '+1', iso: 'TC' },
  { paese: 'Isole Vergini Britanniche', codice: '+1', iso: 'VG' },
  { paese: 'Isole Vergini Americane', codice: '+1', iso: 'VI' },
  { paese: 'Israele', codice: '+972', iso: 'IL' },
  { paese: 'Italia', codice: '+39', iso: 'IT' },
  { paese: 'Jersey', codice: '+44', iso: 'JE' },
  { paese: 'Kazakistan', codice: '+7', iso: 'KZ' },
  { paese: 'Kenya', codice: '+254', iso: 'KE' },
  { paese: 'Kirghizistan', codice: '+996', iso: 'KG' },
  { paese: 'Kiribati', codice: '+686', iso: 'KI' },
  { paese: 'Kosovo', codice: '+383', iso: 'XK' },
  { paese: 'Kuwait', codice: '+965', iso: 'KW' },
  { paese: 'Laos', codice: '+856', iso: 'LA' },
  { paese: 'Lesotho', codice: '+266', iso: 'LS' },
  { paese: 'Lettonia', codice: '+371', iso: 'LV' },
  { paese: 'Libano', codice: '+961', iso: 'LB' },
  { paese: 'Liberia', codice: '+231', iso: 'LR' },
  { paese: 'Libia', codice: '+218', iso: 'LY' },
  { paese: 'Liechtenstein', codice: '+423', iso: 'LI' },
  { paese: 'Lituania', codice: '+370', iso: 'LT' },
  { paese: 'Lussemburgo', codice: '+352', iso: 'LU' },
  { paese: 'Macao', codice: '+853', iso: 'MO' },
  { paese: 'Macedonia del Nord', codice: '+389', iso: 'MK' },
  { paese: 'Madagascar', codice: '+261', iso: 'MG' },
  { paese: 'Malawi', codice: '+265', iso: 'MW' },
  { paese: 'Malaysia', codice: '+60', iso: 'MY' },
  { paese: 'Maldive', codice: '+960', iso: 'MV' },
  { paese: 'Mali', codice: '+223', iso: 'ML' },
  { paese: 'Malta', codice: '+356', iso: 'MT' },
  { paese: 'Marocco', codice: '+212', iso: 'MA' },
  { paese: 'Mauritania', codice: '+222', iso: 'MR' },
  { paese: 'Maurizio', codice: '+230', iso: 'MU' },
  { paese: 'Messico', codice: '+52', iso: 'MX' },
  { paese: 'Micronesia', codice: '+691', iso: 'FM' },
  { paese: 'Moldavia', codice: '+373', iso: 'MD' },
  { paese: 'Monaco', codice: '+377', iso: 'MC' },
  { paese: 'Mongolia', codice: '+976', iso: 'MN' },
  { paese: 'Montenegro', codice: '+382', iso: 'ME' },
  { paese: 'Montserrat', codice: '+1', iso: 'MS' },
  { paese: 'Mozambico', codice: '+258', iso: 'MZ' },
  { paese: 'Myanmar', codice: '+95', iso: 'MM' },
  { paese: 'Namibia', codice: '+264', iso: 'NA' },
  { paese: 'Nauru', codice: '+674', iso: 'NR' },
  { paese: 'Nepal', codice: '+977', iso: 'NP' },
  { paese: 'Nicaragua', codice: '+505', iso: 'NI' },
  { paese: 'Niger', codice: '+227', iso: 'NE' },
  { paese: 'Nigeria', codice: '+234', iso: 'NG' },
  { paese: 'Norvegia', codice: '+47', iso: 'NO' },
  { paese: 'Nuova Caledonia', codice: '+687', iso: 'NC' },
  { paese: 'Nuova Zelanda', codice: '+64', iso: 'NZ' },
  { paese: 'Oman', codice: '+968', iso: 'OM' },
  { paese: 'Paesi Bassi', codice: '+31', iso: 'NL' },
  { paese: 'Pakistan', codice: '+92', iso: 'PK' },
  { paese: 'Palau', codice: '+680', iso: 'PW' },
  { paese: 'Palestina', codice: '+970', iso: 'PS' },
  { paese: 'Panama', codice: '+507', iso: 'PA' },
  { paese: 'Papua Nuova Guinea', codice: '+675', iso: 'PG' },
  { paese: 'Paraguay', codice: '+595', iso: 'PY' },
  { paese: 'Perù', codice: '+51', iso: 'PE' },
  { paese: 'Polinesia Francese', codice: '+689', iso: 'PF' },
  { paese: 'Polonia', codice: '+48', iso: 'PL' },
  { paese: 'Portogallo', codice: '+351', iso: 'PT' },
  { paese: 'Porto Rico', codice: '+1', iso: 'PR' },
  { paese: 'Qatar', codice: '+974', iso: 'QA' },
  { paese: 'Regno Unito', codice: '+44', iso: 'GB' },
  { paese: 'Repubblica Ceca', codice: '+420', iso: 'CZ' },
  { paese: 'Repubblica Centrafricana', codice: '+236', iso: 'CF' },
  { paese: 'Repubblica Dominicana', codice: '+1', iso: 'DO' },
  { paese: 'Romania', codice: '+40', iso: 'RO' },
  { paese: 'Ruanda', codice: '+250', iso: 'RW' },
  { paese: 'Russia', codice: '+7', iso: 'RU' },
  { paese: 'Saint Kitts e Nevis', codice: '+1', iso: 'KN' },
  { paese: 'Saint Lucia', codice: '+1', iso: 'LC' },
  { paese: 'Saint Vincent e Grenadine', codice: '+1', iso: 'VC' },
  { paese: 'Samoa', codice: '+685', iso: 'WS' },
  { paese: 'San Marino', codice: '+378', iso: 'SM' },
  { paese: 'São Tomé e Príncipe', codice: '+239', iso: 'ST' },
  { paese: 'Senegal', codice: '+221', iso: 'SN' },
  { paese: 'Serbia', codice: '+381', iso: 'RS' },
  { paese: 'Seychelles', codice: '+248', iso: 'SC' },
  { paese: 'Sierra Leone', codice: '+232', iso: 'SL' },
  { paese: 'Singapore', codice: '+65', iso: 'SG' },
  { paese: 'Siria', codice: '+963', iso: 'SY' },
  { paese: 'Slovacchia', codice: '+421', iso: 'SK' },
  { paese: 'Slovenia', codice: '+386', iso: 'SI' },
  { paese: 'Somalia', codice: '+252', iso: 'SO' },
  { paese: 'Spagna', codice: '+34', iso: 'ES' },
  { paese: 'Sri Lanka', codice: '+94', iso: 'LK' },
  { paese: 'Stati Uniti', codice: '+1', iso: 'US' },
  { paese: 'Sudafrica', codice: '+27', iso: 'ZA' },
  { paese: 'Sudan', codice: '+249', iso: 'SD' },
  { paese: 'Sudan del Sud', codice: '+211', iso: 'SS' },
  { paese: 'Suriname', codice: '+597', iso: 'SR' },
  { paese: 'Svezia', codice: '+46', iso: 'SE' },
  { paese: 'Svizzera', codice: '+41', iso: 'CH' },
  { paese: 'Tagikistan', codice: '+992', iso: 'TJ' },
  { paese: 'Taiwan', codice: '+886', iso: 'TW' },
  { paese: 'Tanzania', codice: '+255', iso: 'TZ' },
  { paese: 'Thailandia', codice: '+66', iso: 'TH' },
  { paese: 'Timor Est', codice: '+670', iso: 'TL' },
  { paese: 'Togo', codice: '+228', iso: 'TG' },
  { paese: 'Tonga', codice: '+676', iso: 'TO' },
  { paese: 'Trinidad e Tobago', codice: '+1', iso: 'TT' },
  { paese: 'Tunisia', codice: '+216', iso: 'TN' },
  { paese: 'Turchia', codice: '+90', iso: 'TR' },
  { paese: 'Turkmenistan', codice: '+993', iso: 'TM' },
  { paese: 'Tuvalu', codice: '+688', iso: 'TV' },
  { paese: 'Ucraina', codice: '+380', iso: 'UA' },
  { paese: 'Uganda', codice: '+256', iso: 'UG' },
  { paese: 'Ungheria', codice: '+36', iso: 'HU' },
  { paese: 'Uruguay', codice: '+598', iso: 'UY' },
  { paese: 'Uzbekistan', codice: '+998', iso: 'UZ' },
  { paese: 'Vanuatu', codice: '+678', iso: 'VU' },
  { paese: 'Venezuela', codice: '+58', iso: 'VE' },
  { paese: 'Vietnam', codice: '+84', iso: 'VN' },
  { paese: 'Yemen', codice: '+967', iso: 'YE' },
  { paese: 'Zambia', codice: '+260', iso: 'ZM' },
  { paese: 'Zimbabwe', codice: '+263', iso: 'ZW' },
];

/**
 * Compone il numero in forma E.164: `+`, prefisso, cifre. Niente spazi, niente
 * trattini, niente parentesi.
 *
 * Torna `''` se il numero è vuoto — il campo è facoltativo quasi sempre — e
 * `null` se c'è qualcosa ma non è un numero plausibile. **La distinzione conta**:
 * vuoto vuol dire «non me l'ha dato», `null` vuol dire «ha sbagliato a
 * scrivere», e le due cose portano a due comportamenti diversi.
 *
 * Tre cose che il numero scritto a mano fa e che qui si disfano:
 *
 * - **Lo zero iniziale.** In Italia si scrive `06 8100…` per il fisso e in mezza
 *   Europa `07…` per il cellulare: quello zero è il prefisso *nazionale* di
 *   accesso, e in forma internazionale si toglie. `+390 6…` non esiste.
 * - **Il prefisso scritto due volte.** Chi ha l'abitudine lo digita comunque,
 *   `+39 320…` dentro un campo che ha già `+39` nella tendina. Se il numero
 *   comincia col prefisso scelto, quello si scarta invece di raddoppiarlo.
 * - **Lo `00` internazionale.** `0039 320…` è la stessa cosa di `+39 320…`
 *   scritta come la si detta al telefono.
 *
 * Il minimo è quattro cifre e il massimo quindici, che è il limite di E.164
 * prefisso compreso: sotto non è un numero, sopra non può esistere. Non si
 * valida la lunghezza per paese — sarebbero duecento regole da tenere in pari, e
 * il costo di un falso negativo (una persona che non riesce a lasciare il suo
 * numero) è più alto di quello di un numero sbagliato che si scopre al primo
 * messaggio.
 */
export function componiTelefono(prefisso: string, numero: string): string | null {
  const pref = String(prefisso || PREFISSO_PREDEFINITO).replace(/[^\d]/g, '');
  let cifre = String(numero || '').replace(/[^\d+]/g, '');
  if (!cifre) return '';

  cifre = cifre.replace(/^\+/, '').replace(/^00/, '');
  if (pref && cifre.startsWith(pref) && cifre.length > pref.length) {
    cifre = cifre.slice(pref.length);
  }
  cifre = cifre.replace(/^0+/, '');

  if (!cifre) return null;
  const pieno = pref + cifre;
  if (pieno.length < 4 || pieno.length > 15) return null;
  return '+' + pieno;
}

/** L'esito di un controllo: il numero pulito, oppure il motivo del rifiuto. */
export interface EsitoTelefono {
  ok: boolean;
  /** Il numero in E.164, presente solo se `ok`. */
  e164?: string;
  /** Cosa dire alla persona. Una frase, in italiano, che spiega cosa correggere. */
  motivo?: string;
}

/**
 * Il numero è plausibile?
 *
 * Non «è formalmente valido»: **è plausibile**, che è una domanda diversa e più
 * utile. `+393333333333` passa qualunque controllo di formato — dieci cifre, la
 * prima è un 3, è un cellulare italiano perfetto — e non è il numero di nessuno.
 * Chi non vuole lasciare il suo numero digita quello, e il pass che gli
 * mandiamo su WhatsApp non arriva da nessuna parte.
 *
 * Quindi qui ci sono tre controlli in fila, e ognuno ferma una cosa diversa:
 *
 * 1. **La forma.** Lunghezza E.164, e per l'Italia il cellulare deve cominciare
 *    per 3 ed essere di nove o dieci cifre. Un fisso in un campo «cellulare» non
 *    è un errore di battitura: è un numero su cui WhatsApp non esiste.
 * 2. **La varietà delle cifre.** Meno di quattro cifre diverse in un numero
 *    italiano vuol dire che è inventato: `3333333333` ne ha una,
 *    `3331231231` ne ha tre. Un numero vero ne ha in media sei o sette, e non
 *    ho trovato numerazioni reali sotto quattro.
 * 3. **Le sequenze.** `3401234567` e `3409876543` sono la tastiera percorsa in
 *    ordine, non un numero.
 *
 * Fuori dall'Italia si controllano solo la lunghezza e le due trappole sopra: le
 * regole nazionali sono duecento e cambiano, e un falso negativo — una persona
 * vera che non riesce a lasciare il suo numero — costa più di un numero finto
 * che si scopre al primo messaggio non consegnato.
 */
export function validaTelefono(prefisso: string, numero: string): EsitoTelefono {
  const e164 = componiTelefono(prefisso, numero);
  if (e164 === '') return { ok: false, motivo: 'Manca il numero di cellulare.' };
  if (e164 === null) {
    return { ok: false, motivo: 'Il numero non sembra giusto: controlla le cifre.' };
  }

  const pref = String(prefisso || PREFISSO_PREDEFINITO).replace(/[^\d]/g, '');
  const nazionale = e164.slice(1 + pref.length);

  /* Italia: il cellulare comincia per 3 e ha nove o dieci cifre. I nove sono
     le vecchie numerazioni ancora in servizio, tipo `33012345`. */
  if (pref === '39' && !/^3\d{8,9}$/.test(nazionale)) {
    return {
      ok: false,
      motivo: nazionale.startsWith('0')
        ? 'Questo è un numero fisso: serve un cellulare, perché ci scriviamo su WhatsApp.'
        : 'Un cellulare italiano comincia per 3 e ha dieci cifre.',
    };
  }

  if (nazionale.length < 6) {
    return { ok: false, motivo: 'Il numero sembra troppo corto.' };
  }

  const diverse = new Set(nazionale.split('')).size;
  if (diverse < 4) {
    return { ok: false, motivo: 'Questo numero non sembra vero: controllalo.' };
  }

  /* La tastiera in ordine, in salita o in discesa, per almeno **sette** cifre di
     fila. Sette e non sei, e la differenza è misurata: in un numero di dieci
     cifre una sequenza di sei capita per caso circa una volta su diecimila —
     `+44 7911 123456` è un numero dalla forma perfettamente britannica che
     conteneva `123456` e veniva rifiutato. A sette il falso positivo scende di
     un altro ordine di grandezza, e `1234567890` resta preso.

     Il verso giusto in cui sbagliare è questo: un numero finto che passa lo si
     scopre al primo messaggio non consegnato, una persona vera che non riesce a
     lasciare il suo numero non torna. */
  const salita = '01234567890123456789';
  const discesa = '98765432109876543210';
  for (let i = 0; i + 7 <= nazionale.length; i++) {
    const pezzo = nazionale.slice(i, i + 7);
    if (salita.includes(pezzo) || discesa.includes(pezzo)) {
      return { ok: false, motivo: 'Questo numero non sembra vero: controllalo.' };
    }
  }

  return { ok: true, e164 };
}
