'use strict'
const
    Fetch = require('node-fetch'),
    Cheerio = require('cheerio'),
    fs = require('fs')


const
    DEFAULT_OUTPUT = `${__dirname}/../cards.json`,
    DBS_DATA_URLS = [
        'http://www.dbs-cardgame.com/us-en/cardlist/?search=true&category=428001',
        'http://www.dbs-cardgame.com/us-en/cardlist/?search=true&category=428002',
        'http://www.dbs-cardgame.com/us-en/cardlist/?search=true&category=428003',
        'http://www.dbs-cardgame.com/us-en/cardlist/?search=true&category=428402',
        'http://www.dbs-cardgame.com/us-en/cardlist/?search=true&category=428401',
        'http://www.dbs-cardgame.com/us-en/cardlist/?search=true&category=428901',
        'http://www.dbs-cardgame.com/us-en/cardlist/?search=true&category=428303',
        'http://www.dbs-cardgame.com/us-en/cardlist/?search=true&category=428302',
        'http://www.dbs-cardgame.com/us-en/cardlist/?search=true&category=428301'
    ]

const parseSkill = rawHtml => {

    const regexp = /<img.*?alt="(.*?)".*?>/g;
    let match, skillKeywords = [];
    while ((match = regexp.exec(rawHtml)) !== null) {
        // This is necessary to avoid infinite loops with zero-width matches
        if (match.index === regexp.lastIndex) {
            regexp.lastIndex++;
        }

        skillKeywords.push(match[1])
    }
    
    const skillDescription = rawHtml.replace(regexp, '[$1]').replace(/<br\/?>/g, '\n')
    return { skillDescription, skillKeywords }
}

const parseSeries = rawHtml => {
    const series = rawHtml.split(/<br\/?>/g)
    return {
        seriesName: series[0],
        seriesFullName: series[1] ? series[1].replace(/\&\#xFF5E; ?/g, '') : '-'
    }
}

const getImageUrl = elem => elem.attr('src').replace('../..', 'http://www.dbs-cardgame.com')

const getBackCard = elem => {
    const find = elem.find.bind(elem),
          { seriesName, seriesFullName } = parseSeries( find('dl.seriesCol > dd').html() ),
          { skillDescription, skillKeywords } = parseSkill( find('dl.skillCol > dd').html() )

    return {
        seriesName,
        seriesFullName,
        skillDescription,
        skillKeywords,
        'cardImageUrl': getImageUrl( find('.cardimg > img') ),        
        'cardNumber': find('dt.cardNumber').text(),
        'cardName': find('dd.cardName').text(),
        'rarity': find('dl.rarityCol dd').text(),
        'type': find('dl.typeCol dd').text(),
        'color': find('dl.colorCol dd').text(),
        'power': find('dl.powerCol dd').text(),
        'character': find('dl.characterCol dd').text(),
        'specialTrait': find('dl.specialTraitCol dd').text(),
        'era': find('dl.eraCol dd').text(),
        'availableDate': find('dl.availableDateCol dd').text(),
    }
}

const scrapUrl = url =>  
                    Fetch(url)
                        .then( res => res.text() )

                        .then( body =>  Cheerio.load(body) )
                        .then(
                            $ => 
                                $('ul.list-inner > li').toArray().map( cardDomHtml => {
                                    const elem = $(cardDomHtml),
                                        cardFront = elem.find('.cardFront'),
                                        find = cardFront.find.bind(cardFront),
                                        { seriesName, seriesFullName } = parseSeries( find('dl.seriesCol dd').html() ),
                                        { skillDescription, skillKeywords } = parseSkill( find('dl.skillCol dd').html() ),
                                        type = find('dl.typeCol dd').text()

                                    return {
                                        type,
                                        seriesName,
                                        seriesFullName,
                                        skillDescription,
                                        skillKeywords,
                                        'cardImageUrl': getImageUrl( find('.cardimg > img') ),
                                        'cardNumber': find('dt.cardNumber').text(),
                                        'cardName': find('dd.cardName').text(),
                                        'rarity': find('dl.rarityCol dd').text(),
                                        'color': find('dl.colorCol dd').text(),
                                        'power': find('dl.powerCol dd').text(),
                                        'character': find('dl.characterCol dd').text(),
                                        'specialTrait': find('dl.specialTraitCol dd').text(),
                                        'era': find('dl.eraCol dd').text(),
                                        'availableDate': find('dl.availableDateCol dd').text(),
                                        'cardBack': type === 'LEADER' ? getBackCard( elem.find('.cardBack') ) : null
                                    }
                                } )
                        )

const scrapMultipleUrls = urls => Promise.all( urls.map( scrapUrl ) ).then( results => [].concat.apply([], results) )


scrapMultipleUrls(DBS_DATA_URLS)
    .then( allCards => {
        console.log(`Fetched and parsed a total of ${allCards.length} cards.`)
        const outputPath = process.env.CARDS_DATA_OUTPUT || DEFAULT_OUTPUT
        fs.writeFileSync( outputPath, JSON.stringify(allCards) )
        console.log(`Finished saving the cards data in "${outputPath}".`)
    } )
    .catch(console.error)