let axios = require("axios");
let fs = require("fs");

function loadPageData(link) {
    return new Promise(async (resolve, reject) => {
        axios.get("https://www.caranddriver.com/"+link).then(response => {
            let SEARCH_DATA = '<script id="__NEXT_DATA__" type="application/json">'
            let dataStart = response.data.indexOf(SEARCH_DATA) + SEARCH_DATA.length;
            let dataEnd = response.data.indexOf('</script>',dataStart);
            let PAGEData = JSON.parse(response.data.substring(dataStart,dataEnd));
            resolve(PAGEData);
        })
        .catch(err => reject);
    })
}


async function generateTypeData(fromData,type) {
    return new Promise(async (resolve, reject) => {
        let newData = [];
        if(fromData.props.pageProps.makePageFeed[type] && fromData.props.pageProps.makePageFeed[type].length > 0) {
            fromData.props.pageProps.makePageFeed[type].forEach(async model => {
                newData.push({model: model.model});

                for(const key in model.years) {
                    let modelYear = model.years[key];
                    let setId = newData.length-1;
                    let SPECDATA = await loadPageData(modelYear.slug + "/specs").catch(err => reject);
                    let mediaData = await loadPageData(modelYear.slug).catch(err => reject);

                    if(SPECDATA || mediaData) {
                        newData[setId].year = modelYear.year;
                        newData[setId].price = Number(modelYear.formattedPrice.replace("$","").replace(",",""));
                        newData[setId].formattedPrice = modelYear.formattedPrice;
                        newData[setId].previewImage = [];
                        newData[setId].specs = {};
                        newData[setId].slug = modelYear.slug;

    
                        if(SPECDATA) {
                            let CAR_DETAIL = SPECDATA.props.pageProps.data.chromeStyle[0];
                            newData[setId].name = CAR_DETAIL.name;

                            CAR_DETAIL.dataset.configuration.technicalSpecifications.forEach(spec => {
                                if(spec.MOSVisible && spec.value !== "") {
                                    if(newData[setId].specs[spec.ConsumerFriendlyHeaderName]) {}else{newData[setId].specs[spec.ConsumerFriendlyHeaderName] = [];}
                                    newData[setId].specs[spec.ConsumerFriendlyHeaderName].push({
                                        name: spec.ConsumerFriendlyTitleName,
                                        value: spec.value
                                    })
                                }
                            });
                        }

                        if(mediaData) {
                            mediaData.props.pageProps.data.content[0].media.forEach(media => {
                                if(media.media_type == "image" && media.id) {
                                    newData[setId].previewImage.push({url:media.hips_url,credit:media.image_metadata.photo_credit,description:media.image_metadata.seo_meta_title});
                                }
                            })
                        }

                        resolve(newData);
                    }
                    else{
                        reject("no data found..")
                    }
                }
            })
        }
        else{
            reject("no " + type);
        }
    })
}

function generateBrandData(brand) {
    return new Promise(async (resolve, reject) => {
        loadPageData(brand).then(async response => {
            let newBrandData = {}
            let PAGE_FEED = response.props.pageProps.makePageFeed;

            newBrandData = {
                name: PAGE_FEED.name,
                id: PAGE_FEED.id,
                vehicleType: {}
            }

            newBrandData.vehicleType.cars = await generateTypeData(response,"cars");
            newBrandData.vehicleType.eletric = await generateTypeData(response,"ev");
            newBrandData.vehicleType.suvs = await generateTypeData(response,"suvs");
            newBrandData.vehicleType.trucks = await generateTypeData(response,"trucks");
            newBrandData.vehicleType.vans = await generateTypeData(response,"vans");
            newBrandData.vehicleType.discontinued = await generateTypeData(response,"discontinued");

            resolve(newBrandData);
        })
        .catch(err => reject);
    });
}

let generateBrand = [
    "acura","afeela","alfa-romeo","aston-martin","audi","bentley","bmw","bollinger","bugatti","buick",
    "byton","cadillac","chevrolet","chrysler","dodge",
    "ferrari","fiat","fisker","ford","genesis","gmc",
    "honda","hummer","hyundai","infiniti","jaguar","jeep",
    "karma","kia","koenigsegg","lamborghini","land-rover","lexus",
    "lincoln","lordstown","lotus","lucid-motors","maserati","mazda",
    "mclaren","mercedes-amg","mercedes-benz","mercedes-maybach","mercury","mini",
    "mitsubishi","nikola","nissan","pagani","polestar","pontiac",
    "porsche","ram","rimac","rivian","rolls-royce","saab",
    "saturn","scion","scout","smart","spyker","subaru",
    "suzuki","tesla","toyota","vinfast","volkswagen","volvo"
];

let START_AT = new Date().getTime();
console.log("Encoding started..");

generateBrand.forEach(brand => {
    generateBrandData(brand).then(data => {
        fs.writeFileSync("./database/"+data.id+".json",JSON.stringify(data,null,4));
        console.log("Generated " + data.id + ".json");
    })
    .catch(err => console.log);
})

setInterval(function() {
    let END_AT = new Date().getTime();
    console.log("Encoding has been ended after: " + (END_AT - START_AT)/1000 + "seconds");
},1000)