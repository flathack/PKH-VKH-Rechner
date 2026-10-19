import { test, expect } from '@playwright/test';
import { THEMES } from '../../app/theme.mjs';

test.beforeEach(async ({page})=>{await page.goto('./');await page.locator('#approval-date').fill('2026-10-19');});

test('Jahresbeträge sind unabhängig von Sammelzahlung oder Zeilenaufteilung (#20)', async({page},testInfo)=>{
  await page.locator('#net-income').fill('754,32');await page.getByText('Partei ist erwerbstätig',{exact:true}).click();
  await page.locator('#annual-payments').fill('2000,04');await expect(page.locator('.result-card .rate')).toHaveText('0,00 €');
  await page.locator('#annual-payments').fill('0');
  for(let i=0;i<2;i++){await page.getByRole('button',{name:'+ Einnahme',exact:true}).click();const row=page.locator('.entry-grid').last();await row.locator('input[id^="income-"]').fill('1000,02');await row.locator('select').first().selectOption('annual');}
  await expect(page.locator('.result-card .rate')).toHaveText('0,00 €');await expect(page.locator('.breakdown')).toContainText('920,99 €');
  await page.emulateMedia({media:'print'});await expect(page.locator('.document-rate strong')).toHaveText('0,00 €');
  await expect(page.locator('.print-document')).toContainText('Jahressumme 2.000,04 € / 12 = 166,67 €');
  await expect(page.locator('.print-document tr').filter({hasText:'Rundungsausgleich:'})).toContainText('-0,01 €');
  if(testInfo.project.name==='desktop')await page.pdf({path:testInfo.outputPath('jahresumrechnung.pdf'),format:'A4'});
});

test('Wechselmodell berechnet Halbansatz plus Barunterhalt und verlangt Einkommensprüfung (#21)',async({page},testInfo)=>{
  await page.locator('#net-income').fill('2000');await page.getByRole('button',{name:'+ Kind / Person',exact:true}).click();
  await page.locator('.dependent-fields select').nth(1).selectOption('shared');
  await expect(page.locator('.dependent-allowance strong')).toHaveText('196,50 €');await expect(page.locator('.result-card .rate')).toHaveText('884,00 €');
  await page.locator('[id^="shared-maintenance-"]').fill('200');await expect(page.locator('.result-card .rate')).toHaveText('684,00 €');
  await page.locator('[id^="dependent-income-"]').fill('100');await expect(page.locator('.result-card .rate')).toHaveText('—');
  await expect(page.getByRole('button',{name:'Drucken',exact:true})).toBeDisabled();
  await page.locator('input[id^="shared-allowance-"]').fill('100');await page.locator('[id^="shared-note-"]').fill('Kindeseinkommen und Kindergeld im Einzelfall geprüft');
  await expect(page.locator('.result-card .rate')).toHaveText('781,00 €');
  await page.emulateMedia({media:'print'});await expect(page.locator('.print-document')).toContainText('angesetzter hälftiger Freibetrag 100,00 €');
  await expect(page.locator('.print-document')).toContainText('tatsächlicher Barunterhalt 200,00 €');await expect(page.locator('.print-document')).toContainText('Kindeseinkommen und Kindergeld im Einzelfall geprüft');
  if(testInfo.project.name==='desktop')await page.pdf({path:testInfo.outputPath('wechselmodell.pdf'),format:'A4'});
});

test('Wechselmodell prüft zugeordnete Einnahmen, Alter und geänderte örtliche Höchstwerte (#21)',async({page})=>{
  await page.getByRole('button',{name:'+ Kind / Person',exact:true}).click();await page.locator('.dependent-fields select').nth(1).selectOption('shared');
  await page.getByRole('button',{name:'+ Einnahme',exact:true}).click();const row=page.locator('.entry-grid');
  await row.locator('input[id^="income-"]').fill('1200');await row.locator('select').first().selectOption('annual');await row.locator('select').nth(1).selectOption({label:'Unterhaltene Person 1'});
  await expect(page.getByRole('button',{name:'Drucken',exact:true})).toBeDisabled();
  await page.locator('#location').selectOption('muenchen');await page.locator('input[id^="shared-allowance-"]').fill('200');await page.locator('[id^="shared-note-"]').fill('Geprüfter Ansatz');
  await expect(page.getByRole('button',{name:'Drucken',exact:true})).toBeEnabled();
  await page.locator('#location').selectOption('bund');await expect(page.locator('input[id^="shared-allowance-"]')).toHaveAttribute('aria-invalid','true');
  await expect(page.getByRole('button',{name:'Drucken',exact:true})).toBeDisabled();await page.locator('input[id^="shared-allowance-"]').fill('196,50');
  await expect(page.getByRole('button',{name:'Drucken',exact:true})).toBeEnabled();
  await page.locator('.dependent-fields select').first().selectOption('adult');await expect(page.getByRole('button',{name:'Drucken',exact:true})).toBeDisabled();
  await page.locator('.dependent-fields select').nth(1).selectOption('maintenance');await expect(page.getByRole('button',{name:'Drucken',exact:true})).toBeEnabled();
});

test('Späte Belastungsenden lassen aktuelle Rate berechnen und halten die Staffelprognose offen (#22)',async({page})=>{
  await page.locator('#net-income').fill('2000');await page.locator('#special-burdens').fill('1400');await page.locator('#special-end').fill('2035-12');await page.locator('#assets').fill('0');await page.locator('#costs').fill('1000');
  await expect(page.locator('.result-card .rate')).toHaveText('0,00 €');await expect(page.locator('.maximum strong')).toHaveText('Nicht bestimmbar');
  await expect(page.locator('.result-card')).toContainText('Keine belastbare Staffelprognose');await expect(page.locator('.result-card')).not.toContainText('1.081,00 €');
  await page.locator('#payment-start').fill('2035-12');await expect(page.locator('.maximum strong')).toHaveText('Nicht bestimmbar');
  await page.emulateMedia({media:'print'});await expect(page.locator('.print-document')).toContainText('Kostendeckung und Obergrenze sind offen');
  await expect(page.locator('.print-document')).not.toContainText('Kostendeckung nach 1 Zahlungsraten');await expect(page.locator('.print-document')).not.toContainText('Mit diesem Ratenplan keine Kostendeckung');
  await page.emulateMedia({media:'screen'});await page.locator('#payment-start').fill('');await page.locator('#special-end').fill('2030-09');
  await expect(page.locator('.maximum strong')).toHaveText('51.888,00 €');await expect(page.locator('#vermoegen')).toContainText('1 (innerhalb von 48 Raten)');
  await page.locator('#special-end').fill('2030-10');await expect(page.locator('.maximum strong')).toHaveText('Nicht bestimmbar');
});

test('Erwerbstätigenannahme und geprüfte Abweichung werden dokumentiert (#23)',async({page},testInfo)=>{
  await page.locator('#net-income').fill('100');await page.locator('#other-income').fill('1000');await page.getByText('Partei ist erwerbstätig',{exact:true}).click();
  await expect(page.locator('.result-card .rate')).toHaveText('99,00 €');await page.locator('#party-employment-mode').selectOption('limited');
  await expect(page.locator('.result-card .rate')).toHaveText('—');await page.locator('#party-earned-income').fill('100');await expect(page.locator('.result-card .rate')).toHaveText('190,00 €');
  await page.emulateMedia({media:'print'});await expect(page.locator('.print-document')).toContainText('OLG Bamberg, 13.10.2025');await page.emulateMedia({media:'screen'});
  await page.locator('#party-employment-mode').selectOption('reviewed');await page.locator('#party-reviewed-allowance').fill('80');await expect(page.getByRole('button',{name:'Drucken',exact:true})).toBeDisabled();
  await page.locator('#party-employment-note').fill('Gerichtlich geprüfter Betrag: '+ 'Einkommensabgrenzung_'.repeat(16));await expect(page.locator('.result-card .rate')).toHaveText('200,00 €');
  await page.emulateMedia({media:'print'});await expect(page.locator('.print-document')).toContainText('abweichender fachlich geprüfter Betrag');
  expect(await page.locator('.print-document').evaluate(e=>e.scrollWidth<=Math.ceil(e.getBoundingClientRect().width))).toBe(true);
  if(testInfo.project.name==='desktop')await page.pdf({path:testInfo.outputPath('erwerbstaetigenannahme.pdf'),format:'A4'});
  await page.emulateMedia({media:'screen'});await page.locator('#party-reviewed-allowance').fill('283');await expect(page.getByRole('button',{name:'Drucken',exact:true})).toBeDisabled();
  await page.locator('#party-employment-mode').selectOption('full');await expect(page.locator('.result-card .rate')).toHaveText('99,00 €');
});

test('Angehörigenbereinigung verlangt eigene Begründung und vermeidet Doppelabzug (#23)',async({page})=>{
  await page.locator('#net-income').fill('2000');await page.getByText('Ehe- oder eingetragene Lebenspartnerschaft',{exact:true}).click();
  await page.locator('#spouse-income').fill('600');await page.getByText('Partnerperson ist erwerbstätig',{exact:true}).click();await page.locator('#spouse-employment-mode').selectOption('limited');
  await page.locator('#spouse-earned-income').fill('100');await expect(page.getByRole('button',{name:'Drucken',exact:true})).toBeDisabled();
  await page.locator('#spouse-employment-note').fill('Anwendung auf die Partnerperson fachlich geprüft');await expect(page.locator('.sub-result strong')).toHaveText('119,00 €');
  await page.getByText('Einkommen bereits vollständig bereinigt',{exact:true}).click();await expect(page.locator('.sub-result strong')).toHaveText('19,00 €');
  await page.emulateMedia({media:'print'});await expect(page.locator('.print-document')).toContainText('Erwerbstätigenfreibetrag kein weiterer Ansatz');
});

test('Neue Rechtsannahmen und Wechselmodellfelder passen in alle Themes und Breiten',async({page},testInfo)=>{
  await page.getByText('Partei ist erwerbstätig',{exact:true}).click();await page.locator('#party-employment-mode').selectOption('limited');
  await page.getByRole('button',{name:'+ Kind / Person',exact:true}).click();await page.locator('.dependent-fields select').nth(1).selectOption('shared');
  for(const width of [320,430,1100,1280,1440]){await page.setViewportSize({width,height:900});for(const theme of THEMES){
    await page.locator('#theme-select').selectOption(theme.value);expect(await page.locator('body').evaluate(e=>e.scrollWidth<=e.clientWidth)).toBe(true);
    for(const field of await page.locator('.employment-fields input,.employment-fields select,.dependent-fields input,.dependent-fields select').evaluateAll(es=>es.map(e=>({width:e.getBoundingClientRect().width,right:e.getBoundingClientRect().right})))){expect(field.width).toBeGreaterThanOrEqual(width>1000?150:44);expect(field.right).toBeLessThanOrEqual(width);}
  }}
  await page.locator('.dependent-row').scrollIntoViewIfNeeded();await page.screenshot({path:testInfo.outputPath('wechselmodell-felder.png')});
});
