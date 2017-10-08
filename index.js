#!/usr/bin/env node
const program = require('commander');
const chalk   = require('chalk');
const cheerio = require('cheerio');
const version = require('./package.json').version;
const exec    = require('child_process').exec;
const request = require('request');
const ora     = require('ora');
const spinner = ora('Loading...');
const baseUrl = 'http://cn.bing.com/dict/search?q=';

program
    .version(version)
    .name('bdic')
    .arguments('<word>')
    .usage('[options] <word>')
    .option('-c --complete', 'Complete definition')
    .option('-b --browser', 'Search in browser')
    .on('--help', () => {console.log()})
    .action((word, options) => {
        let url = baseUrl + encodeURIComponent(word);
        if (options.browser) {
            openInBrowser(url);
        } else {
            searchWord(url, options.complete);
        }
    })
    .parse(process.argv);

/**
 * Open in browser
 * @param {*} url 
 */
function openInBrowser(url) {
    if (process.platform === 'darwin') {
        exec(`open ${url}`);
    } else if (process.platform === 'win32') {
        exec(`start ${url}`);
    }
}

/**
 * Search target word
 * @param {*} url 
 * @param {*} complete_mode 
 */
function searchWord(url, complete_mode) {
    spinner.start();
    request(url, (err, res, body) => {
        spinner.stop();
        parseContent(body, complete_mode);
    });
}

/**
 * Parse document content
 * @param {*} body 
 * @param {*} complete_mode 
 */
function parseContent(body, complete_mode) {

    let $ = cheerio.load(body);
    let $lf_area = $('.content .lf_area');
    let headword = $lf_area.find('#headword').text();
    if (!headword) {
        console.log(chalk.red('没有找到相关的结果'));
        return;
    }
    console.log();

    // headword and phonetic symbol
    if (complete_mode) {
        let phonetic_symbol = $lf_area.find('.hd_tf_lh').text();
        console.log(`    ${chalk.whiteBright.bold.underline(headword)}  ${phonetic_symbol}\n`);
    }

    // definitions
    $lf_area.find('.qdef ul li').each((i, v) => {
        let pos = $(v).find('.pos').text();
        let def = $(v).find('.def').text();
        let line = `    ${chalk.cyanBright(pos)} ${chalk.whiteBright(def)}`;
        console.log(line);
    });
    console.log();

    // sentences
    if (complete_mode) {
        console.log(`    ${chalk.bgWhite.black(' 例句 ')}\n`);
        $lf_area.find('#sentenceSeg .se_li').each((i, v) => {
            let num    = $(v).find('.se_n_d').text();
            let sen_en = $(v).find('.sen_en').text();
            let sen_cn = $(v).find('.sen_cn').text();
            let sen_en_word = $(v).find('.sen_en .p1-7').text();
            let sen_cn_word = $(v).find('.sen_cn .p1-7').text();
            sen_en = sen_en.replace(sen_en_word, chalk.cyan(sen_en_word));
            sen_cn = sen_cn.replace(sen_cn_word, chalk.cyan(sen_cn_word));
            if (i >= 3) return;
            console.log(`    ${chalk.whiteBright(num)} ${chalk.whiteBright(sen_en)}\n       ${chalk.white(sen_cn)}\n`);
        });
    }

}
