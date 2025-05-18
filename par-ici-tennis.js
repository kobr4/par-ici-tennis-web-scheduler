import { chromium } from 'playwright'
import dayjs from 'dayjs'
import customParseFormat from 'dayjs/plugin/customParseFormat.js'
import { parseqAPI } from './lib/parseq.js'
import { config } from './staticFiles.js'
import { sendImageToGPT } from './chatgpt_resolve.js';

dayjs.extend(customParseFormat)

function log(buffer, message) {
  buffer.push(message);
  console.log(message)
};


const bookTennis = async (dryMode, login, password, hourIn, dayOfTheWeek, player1firstname, player1lastname, player2firstname, player2lastname, locationIn, court, pricetypeIn) => {
  const DRY_RUN_MODE = dryMode

  const nextDayOfTheWeek = new Date()

  var logBuffer = [];
  do {
    nextDayOfTheWeek.setDate(nextDayOfTheWeek.getDate() + 1) // Adding 1 day
  } while (nextDayOfTheWeek.getDay() != dayOfTheWeek)


  log(logBuffer,`Reservation pour ${nextDayOfTheWeek}`)
  log(logBuffer,`hourIn: ${hourIn}`)
  log(logBuffer,`dayOfTheWeek: ${dayOfTheWeek}`)
  log(logBuffer,`locationIn: ${locationIn}`)
  log(logBuffer,`court: ${court}`)
  log(logBuffer,`pricetypeIn: ${pricetypeIn}`)
  log(logBuffer,`player1firstname: ${player1firstname}`)
  log(logBuffer,`player1lastname: ${player1lastname}`)
  log(logBuffer,`player2firstname: ${player2firstname}`)
  log(logBuffer,`player2lastname: ${player2lastname}`)
  if (DRY_RUN_MODE) {
    log(logBuffer,'----- DRY RUN START -----')
    log(logBuffer,'Script lancé en mode DRY RUN. Afin de tester votre configuration, une recherche va être lancé mais AUCUNE réservation ne sera réalisée')
  }

  log(logBuffer,`${dayjs().format()} - Starting searching tennis`)
  const browser = await chromium.launch({ headless: true, slowMo: 0, timeout: 8000 })

  log(logBuffer,`${dayjs().format()} - Browser started`)
  const page = await browser.newPage()
  page.setDefaultTimeout(120000)
  await page.goto('https://tennis.paris.fr/tennis/jsp/site/Portal.jsp?page=tennis&view=start&full=1')

  await page.click('#button_suivi_inscription')
  await page.fill('#username', login)
  await page.fill('#password', password)
  await page.click('#form-login >> button')

  log(logBuffer,`${dayjs().format()} - User connected`)

  // wait for login redirection before continue
  await page.waitForSelector('.main-informations')

  try {
    locationsLoop:
    for (const location of [locationIn]) {
      log(logBuffer,`${dayjs().format()} - Search at ${location}`)
      await page.goto('https://tennis.paris.fr/tennis/jsp/site/Portal.jsp?page=recherche&view=recherche_creneau#!')

      // select tennis location
      await page.type('.tokens-input-text', `${location} `)
      await page.waitForSelector(`.tokens-suggestions-list-element >> text="${location}"`)
      await page.click(`.tokens-suggestions-list-element >> text="${location}"`)

      // select date
      await page.click('#when')
      const date = nextDayOfTheWeek ? dayjs(nextDayOfTheWeek) : dayjs().add(6, 'days')
      //const date = nextDayOfTheWeek
      log(logBuffer,date.format())
      log(logBuffer,`${date.format('DD/MM/YYYY')}`)
      await page.waitForSelector(`[dateiso="${date.format('DD/MM/YYYY')}"]`)
      await page.click(`[dateiso="${date.format('DD/MM/YYYY')}"]`)
      await page.waitForSelector('.date-picker', { state: 'hidden' })

      await page.click('#rechercher')

      // wait until the results page is fully loaded before continue
      await page.waitForLoadState('domcontentloaded')

      let selectedHour
      hoursLoop:
      for (const hour of [hourIn]) {
        const dateDeb = `[datedeb="${date.format('YYYY/MM/DD')} ${hour}:00:00"]`
        if (await page.$(dateDeb)) {
          if (await page.isHidden(dateDeb)) {
            await page.click(`#head${location.replaceAll(' ', '')}${hour}h .panel-title`)
          }

          const slots = await page.$$(dateDeb)
          for (const slot of slots) {
            const bookSlotButton = `[courtid="${await slot.getAttribute('courtid')}"]${dateDeb}`
            const [priceType, courtType] = await (
              await (await page.$(`.price-description:left-of(${bookSlotButton})`)).innerHTML()
            ).split('<br>')
            if (![pricetypeIn].includes(priceType) || ![court].includes(courtType)) {
              continue
            }
            selectedHour = hour
            await page.click(bookSlotButton)

            break hoursLoop
          }
        }
      }

      if (await page.title() !== 'Paris | TENNIS - Reservation') {
        log(logBuffer,`${dayjs().format()} - Failed to find reservation for ${location}`)
        await page.screenshot({ path: 'img/no_reservation.png' })
        continue
      }

      await page.waitForLoadState('domcontentloaded')

      if (await page.$('.captcha')) {
        let i = 0
        let note
        do {
          if (i > 2) {
            throw new Error('Can\'t resolve captcha, reservation cancelled')
          }

          if (i > 0) {
            const iframeDetached = new Promise((resolve) => {
              page.on('framedetached', () => resolve('New captcha'))
            })
            await iframeDetached
          }
          const captchaIframe = await page.frameLocator('#li-antibot-iframe')
	  await page.pdf({ path: 'page.pdf' });
          const captcha = await captchaIframe.locator('#li-antibot-questions-container img').screenshot({ path: 'img/captcha.png' })
          const resCaptcha = await parseqAPI(new Blob([captcha]))
          log(logBuffer,`Captcha result: ${resCaptcha}`)
          const resCaptchGPT = await sendImageToGPT('img/captcha.png')
          log(logBuffer,`Captcha GPT result: ${resCaptchGPT}`)
          await captchaIframe.locator('#li-antibot-answer').type(resCaptcha)
          await captchaIframe.locator('#li-antibot-validate').click()

          note = await captchaIframe.locator('#li-antibot-check-note')
          i++
        } while (await note.innerText() !== 'Vérifié avec succès')

        await page.click('#submitControle')
      }

      let players = [{"firstName": player1firstname, "lastName": player1lastname},{"firstName": player2firstname, "lastName": player2lastname}]
      for (const [i, player] of players.entries()) {
        if (i > 0 && i < players.length) {
          await page.click('.addPlayer')
        }
        await page.waitForSelector(`[name="player${i + 1}"]`)
        await page.fill(`[name="player${i + 1}"] >> nth=0`, player.lastName)
        await page.fill(`[name="player${i + 1}"] >> nth=1`, player.firstName)
      }

      await page.keyboard.press('Enter')

      await page.waitForSelector('#order_select_payment_form #paymentMode', { state: 'attached' })
      const paymentMode = await page.$('#order_select_payment_form #paymentMode')
      await paymentMode.evaluate(el => {
        el.removeAttribute('readonly')
        el.style.display = 'block'
      })
      await paymentMode.fill('existingTicket')

      if (DRY_RUN_MODE) {
        log(logBuffer,`${dayjs().format()} - Fausse réservation faite : ${location}`)
        log(logBuffer,`pour le ${date.format('YYYY/MM/DD')} à ${selectedHour}h`)
        log(logBuffer,'----- DRY RUN END -----')
        log(logBuffer,'Pour réellement réserver un crénau, relancez le script sans le paramètre --dry-run')

        await page.click('#previous')
        await page.click('#btnCancelBooking')

        break locationsLoop
      }

      const submit = await page.$('#order_select_payment_form #envoyer')
      submit.evaluate(el => el.classList.remove('hide'))
      await submit.click()

      await page.waitForSelector('.confirmReservation')

      log(logBuffer,`${dayjs().format()} - Réservation faite : ${await (
        await (await page.$('.address')).textContent()
      ).trim().replace(/( ){2,}/g, ' ')}`)
      log(logBuffer,`pour le ${await (
        await (await page.$('.date')).textContent()
      ).trim().replace(/( ){2,}/g, ' ')}`)
      break
    }
  } catch (e) {
    log(logBuffer,e)
    await page.screenshot({ path: 'img/failure.png' })
  }

  await browser.close()
  console.log("Exiting");
  return logBuffer.join('\n');
}

const _bookTennis = bookTennis
export { _bookTennis as bookTennis }