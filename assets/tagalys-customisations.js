// TAGALYS UTILITIES
TagalysCustomizations = {}
TagalysCustomizations.utilities = {}
TagalysCustomizations.utilities.setConfiguration = function() {
  Tagalys.setConfiguration({
    api: {
      serverUrl: "https://api-r3.tagalys.com",
      credentials: {
        clientCode: "3D476828428E5ACA",
        apiKey: "280e1cbfbb006ea9b2eb6a43630d7571"
      },
      storeId: "32542523523"
    },
    platform: "Shopify",
    locale: "en-US",
    currency: {
      displayFormatter: "{{currencyLabel}}{{value}}",
      code: "USD",
      label: "$",
      fractionalDigits: 2,
      forceFractionalDigits: true
    },
    analyticsStorageConsentProvided: function(){
      // return true/false based on user's consent settings
      return true
    },
    track: true
  });
}

TagalysCustomizations.utilities.getVariantId = function (stringToMatch, variants) {
  let invalidExp = /[°"§%()\[\]{}=\\?´`'#<>|,;.:+_-]+/g
  var words = stringToMatch.replace(invalidExp,"").replace(/\//g, " ").replace(/\s+/g, " ").split(' ');
  var variantIdToCountMap = {}
  words.forEach(function (word) {
    var regex = new RegExp(word, "gi")
    variants.forEach(function(variant) {
      var matchedStrings = variant.title.match(regex)
      if (matchedStrings) {
        if (variantIdToCountMap.hasOwnProperty(variant.id)) {
          variantIdToCountMap[variant.id] += matchedStrings.length;
        } else {
          variantIdToCountMap[variant.id] = matchedStrings.length
         }
      }
    })
  })
  var maxValue = Object.entries(variantIdToCountMap).sort((x, y) => y[1] - x[1])[0];
  return maxValue ? maxValue[0] : false
}

TagalysCustomizations.utilities.getNamespacedQuerySelector = function (namespace, productId, cssSelector) {
  return `${namespace} [data-product-id="${productId}"] ${cssSelector}`
}

TagalysCustomizations.utilities.handleOnImageError = function (event, product, namespace) {
  var variantId = event.target.dataset.variantId;
  event.target.classList.remove("swatch-active")
  var fallbackSwatchImageSelector = TagalysCustomizations.utilities.getNamespacedQuerySelector(namespace, product.id,  `[data-variant-id="${variantId}"] .fallback-swatch-image`)
  var fallbackSwatchElement = document.querySelector(fallbackSwatchImageSelector)
  fallbackSwatchElement.classList.add("swatch-active")
}

TagalysCustomizations.utilities.getPrimaryImageToDisplay = function (query, product) {
  var variantId = TagalysCustomizations.utilities.getVariantId(query, product.variants)
  if (variantId) {
    var image = product.images.find(function(image){
      return image.variant_ids.includes(parseInt(variantId))
    })
    if(image){
      return image.src
    }
  }
  var fallbackImageSrc = product.__tagalys_fields.image_url
  if(product.variants.length >= 1){
    var variantImage = product.images.find(function(image){
      return image.variant_ids.includes(product.variants[0].id)
    })
    if(variantImage){
      fallbackImageSrc = variantImage.src
    }
  }
  return fallbackImageSrc
}

TagalysCustomizations.utilities.getSwatchId = function (variantTitle) {
  return variantTitle
    .replace(/\//g, " ")
    .replace(/\s+/g, "-")
    .toLowerCase();
}

TagalysCustomizations.utilities.getFallbackSwatchColor = function (variant) {
  var swatchId = TagalysCustomizations.utilities.getSwatchId(variant.title)
  var fallbackColor = swatchId.split("-").pop()
  return fallbackColor
}

TagalysCustomizations.utilities.getSwatchImageUrl = function (variantTitle) {
  var prefix = "https://cdn.shopify.com/s/files/1/0325/4252/3523/files/color-";
  var swatchId = TagalysCustomizations.utilities.getSwatchId(variantTitle)
  var suffix = "_50x.png";
  return prefix + swatchId + suffix;
}

TagalysCustomizations.utilities.onColorSwatchMouseHover = function (event, product, namespace) {
  var variantId = event.target.dataset.variantId;
  var hasVariantImage = product.images.find((image)=>{
    return image.variant_ids.includes(parseInt(variantId))
  })

  if(hasVariantImage){
    var currentActiveImage = document.querySelector(TagalysCustomizations.utilities.getNamespacedQuerySelector(namespace, product.id, ".product-image.is-active"))
    currentActiveImage.classList.remove("is-active")
    var imageDom = document.querySelector(TagalysCustomizations.utilities.getNamespacedQuerySelector(namespace, product.id,  `[data-variant-id="${variantId}"]`));
    imageDom.classList.add("is-active")
  }else{
    TagalysCustomizations.utilities.setPrimaryImageAsActive(product, namespace)
  }
}

TagalysCustomizations.utilities.setPrimaryImageAsActive = function(product, namespace){
  var currentActiveImage = document.querySelector(TagalysCustomizations.utilities.getNamespacedQuerySelector(namespace, product.id, ".product-image.is-active"))
  currentActiveImage.classList.remove("is-active")
  var primaryImage = document.querySelector(TagalysCustomizations.utilities.getNamespacedQuerySelector(namespace, product.id, "[data-primary-image]"))
  // 3: Make it is active
  primaryImage.classList.add("is-active")
}

TagalysCustomizations.utilities.onColorSwatchMouseOut = function (event, product, namespace) {
  TagalysCustomizations.utilities.setPrimaryImageAsActive(product, namespace)
}

TagalysCustomizations.utilities.productRenderer = function (html, args, options = { query: "", namespace: "", widgetContext: "" }) {
  var props = args.props;
  var product = props.product;
  var helpers = props.helpers;
  var productLink = product.__tagalys_fields.link
  var productPrimaryImage = TagalysCustomizations.utilities.getPrimaryImageToDisplay(options.query, product)
  var isProductOnSale = product.tags.includes("sale");
  var isCompatibleWithMagsafe = product.tags.includes("_label_magsafe");
  var isDesignedBySamsung = product.tags.includes("_label_samsung");
  var isProductSoldOut = (product.__tagalys_fields.in_stock === false);
  var showCustomTag = (!isProductOnSale && !isProductSoldOut)
  var modelTag = product.tags.find(function (item) {
    return item.includes("model:");
  });
  var modelName = "";
  if (modelTag) {
    modelName = modelTag.split("model:").join("").trim();
  }

  var productTagClasses = ["product-tag"];
  if (isProductOnSale) {
    productTagClasses.push("product-sale-label");
  }
  if (isProductSoldOut) {
    productTagClasses.push("product-sold-out-label");
  }
  if(showCustomTag){
    productTagClasses.push("product-custom-tag")
  }
  var productTagClass = productTagClasses.join(" ");

  var imagesWithVariants = product.images.filter(function (image) {
    return image.variant_ids.length > 0;
  });

  var getProductTagTemplateName = function () {
    if(isProductSoldOut){
      return "soldOutLabel"
    }
    if(isProductOnSale){
      return "saleLabel"
    }
    if(isCompatibleWithMagsafe && showCustomTag){
      return "magSafeLabel"
    }
    if(isDesignedBySamsung && showCustomTag){
      return "samsungLabel"
    }
    return false
  }

  var productTagTemplateName = getProductTagTemplateName()

  return html`
    <div class="product" data-product-id=${product.id} aria-label="product">
      <a
        class="product-link"
        href=${productLink}
        target="_blank"
      >
        ${productTagTemplateName ? html `
          <div class=${productTagClass}>
            <${args.templates[productTagTemplateName]}/>
          </div>
        `
        : null}
        <span class="product-image-container">
          <img
            class="product-image is-active"
            data-primary-image
            src=${productPrimaryImage}
            alt=${product.title}
          />
          ${imagesWithVariants.map(function (image) {
            return html`
              <img
                data-variant-id=${image.variant_ids[0]}
                class="product-image"
                src=${image.src}
                alt=${image.alt}
              />
            `;
          })}
        </span>
        <div class="product-details">
          <h3 class="product-name" dangerouslySetInnerHTML=${{ __html: product.title}}></h3>
          <div class="product-model">${modelName}</div>
          ${!isProductSoldOut ? html `
            <div
              class=${`product-prices${
                helpers.isProductOnSale(
                  product.compare_at_price,
                  product.price
                )
                  ? " discounted"
                  : " full-price"
              }`}
            >
              ${helpers.isProductOnSale(
                product.compare_at_price,
                product.price
              )
                ? html`
                    <div class="product-price-regular">
                      ${helpers.formatCurrency(
                        product.compare_at_price === null
                          ? product.price
                          : product.compare_at_price
                      )}
                    </div>
                    <div class="product-price-discounted">
                      ${` from `}${helpers.formatCurrency(product.price)}
                    </div>
                  `
                : html`
                    <div class="product-price-regular">
                      ${helpers.formatCurrency(
                        product.compare_at_price === null
                          ? product.price
                          : product.compare_at_price
                      )}
                    </div>
                  `}
            </div>
          ` : null}
          <!-- end_pwr_category_snippet -->
        </div>
      </a>
      <ul class="swatch-list">
        ${product.variants.length > 1 ? html `
          ${product.variants.map(function (variant) {
            var fallbackSwatchColor = TagalysCustomizations.utilities.getFallbackSwatchColor(variant)
            var style = { backgroundColor: fallbackSwatchColor }
            return html`<li
              onMouseEnter=${function (event) {
                TagalysCustomizations.utilities.onColorSwatchMouseHover(event, product, options.namespace);
              }}
              onMouseLeave=${function (event) {
                TagalysCustomizations.utilities.onColorSwatchMouseOut(event, product, options.namespace);
              }}
              data-variant-id=${variant.id}
            >
              <a
                class="color-swatch"
                href=${`${productLink}?variant=${variant.id}`}
                target="_blank"
                aria-label=${variant.title}
              >
                <img
                  class="swatch-active swatch"
                  data-variant-id=${variant.id}
                  src="${TagalysCustomizations.utilities.getSwatchImageUrl(variant.title)}"
                  onError=${function (event) {
                    TagalysCustomizations.utilities.handleOnImageError(event, product, options.namespace);
                  }}
                />
                <span class="swatch fallback-swatch-image" style=${style}></span>
              </a>
            </li>`;
          })}
        ` : null}
      </ul>
      <!-- start_pwr_category_snippet -->
      <div class="pwr-category-snippets exclude-tagalys-css-reset"><div id=${`${options.widgetContext}-snippet-${product.id}`}></div></div>
    </div>
  `;
}

TagalysCustomizations.utilities.getPagesToDisplay = function(currentPage, totalPages, delta) {
  var current = currentPage,
      last = totalPages,
      left = current - delta,
      right = current + delta + 1,
      range = [],
      rangeWithDots = [],
      l;

  for (let i = 1; i <= last; i++) {
      if (i == 1 || i == last || i >= left && i < right) {
          range.push(i);
      }
  }

  for (let i of range) {
      if (l) {
          if (i - l === 2) {
          rangeWithDots.push({
            page: l + 1,
            current: current === (l + 1),
          });
          } else if (i - l !== 1) {
            rangeWithDots.push({
              jumpAfter: true
            })
          }
      }
      rangeWithDots.push({
        page: i,
        current: (i === current)
      });
      l = i;
  }

  return rangeWithDots;
}

TagalysCustomizations.utilities.initProductRatings = function(helpers, options = { baseSelector: "", widgetContext: ""  }){
  var apiResponse = helpers.getAPIResponse();
  window.pwr = window.pwr || function () {
    (pwr.q = pwr.q || []).push(arguments);
  };
  var json_list = [];
  var m = 0
  document.querySelectorAll(`${options.baseSelector} .pwr-category-snippets`).forEach(element => {
    element.innerHTML = `<div id="${options.widgetContext}-snippet-${apiResponse.products[m].id}"></div>`;
    m++;
  });
  for (let i = 0; i < apiResponse.products.length; i++) {
    const product = apiResponse.products[i];
    var json = {
      api_key: 'ea86d570-8331-45c7-a38b-107ca54b89b3',
      locale: 'en_US',
      merchant_group_id: '47546',
      merchant_id: '37684',
      page_id: product.id,
      components: {
        CategorySnippet: `${options.widgetContext}-snippet-${product.id}`
      }
    };
    json_list.push(json)
  }
  pwr('render', json_list);
}

// COMMON TEMPLATES
TagalysCustomizations.commonTemplates = {
  soldOutLabel: {
    render: function (html, args) {
      return html `Sold Out`;
    },
  },
  saleLabel: {
    render: function (html, args) {
      return html `Sale`;
    },
  },
  magSafeLabel: {
    render: function (html, args) {
      return html`
        <svg
          width="90px"
          height="22px"
          viewBox="0 0 90 22"
          version="1.1"
          xmlns="http://www.w3.org/2000/svg"
          xmlns:xlink="http://www.w3.org/1999/xlink"
          role="img"
          aria-labelledby="flagTitle_6722860941443"
        >
          <title id="flagTitle_6722860941443">
            Compatible with MagSafe
          </title>
          <g
            id="Design_6722860941443"
            stroke="none"
            stroke-width="1"
            fill="none"
            fill-rule="evenodd"
          >
            <g
              id="product-flags_6722860941443"
              transform="translate(-580.000000, -97.000000)"
              fill="#231F20"
            >
              <g
                id="compatible-with-magsafe_6722860941443"
                transform="translate(579.999700, 97.333900)"
              >
                <polygon
                  id="Fill-1_6722860941443"
                  points="10.3860545 13.8233455 7.64187273 17.4828 6.34423636 17.4828 3.57878182 13.8026182 3.57878182 20.8651636 0.514963636 20.8651636 0.536236364 8.10098182 3.02569091 8.10098182 6.98241818 13.5680727 10.9396909 8.10098182 13.4280545 8.10098182 13.4493273 20.8651636 10.3860545 20.8651636"
                ></polygon>
                <path
                  d="M19.4904545,16.1425636 L22.7244545,16.1425636 L21.1071818,11.4200182 L19.4904545,16.1425636 Z M27.6597273,20.8651091 L24.3411818,20.8651091 L23.5535455,18.5676545 L18.6608182,18.5676545 L17.8737273,20.8651091 L14.5551818,20.8651091 L19.4266364,8.10092727 L22.7877273,8.10092727 L27.6597273,20.8651091 Z"
                  id="Fill-2_6722860941443"
                ></path>
                <path
                  d="M33.9982364,13.2704182 L40.3587818,13.2704182 L40.3587818,15.1216909 C40.3587818,18.7593273 37.9975091,21.1418727 34.2747818,21.1418727 C30.1904182,21.1418727 27.7647818,18.1424182 27.7647818,14.4835091 C27.7647818,10.8240545 30.2329636,7.8246 34.3173273,7.8246 C37.5720545,7.8246 38.9335091,9.41950909 38.9335091,9.41950909 L37.0827818,11.8026 C37.0827818,11.8026 36.1042364,10.7815091 34.2747818,10.7815091 C32.3815091,10.7815091 30.9562364,12.2706 30.9562364,14.4835091 C30.9562364,16.6953273 32.3815091,18.1849636 34.2747818,18.1849636 C36.0191455,18.1849636 36.8700545,17.1638727 36.9126,15.8449636 L36.9126,15.6955091 L33.9982364,15.6955091 L33.9982364,13.2704182 Z"
                  id="Fill-3_6722860941443"
                ></path>
                <path
                  d="M42.9753818,17.0784545 C42.9753818,17.0784545 44.8048364,18.3122727 46.5279273,18.3122727 C47.4852,18.3122727 47.9319273,17.8868182 47.9319273,17.2486364 C47.9319273,16.5891818 47.5277455,16.2488182 45.7402909,15.717 C43.0599273,14.9299091 41.5288364,13.887 41.5288364,11.781 C41.5288364,9.46227273 43.1024727,7.82427273 46.4641091,7.82427273 C49.9315636,7.82427273 51.2717455,9.18572727 51.2717455,9.18572727 L49.6124727,11.6964545 C49.6124727,11.6964545 48.2722909,10.6328182 46.4641091,10.6328182 C45.4212,10.6328182 45.0808364,11.037 45.0808364,11.5682727 C45.0808364,12.2064545 45.6344727,12.4617273 47.1017455,12.8871818 C49.9315636,13.6748182 51.5482909,14.781 51.5482909,16.9082727 C51.5482909,19.227 49.9953818,21.1415455 46.6342909,21.1415455 C43.1024727,21.1415455 41.2942909,19.4397273 41.2942909,19.4397273 L42.9753818,17.0784545 Z"
                  id="Fill-5_6722860941443"
                ></path>
                <path
                  d="M56.6959091,16.1425636 L59.9299091,16.1425636 L58.3126364,11.4200182 L56.6959091,16.1425636 Z M64.8651818,20.8651091 L61.5466364,20.8651091 L60.759,18.5676545 L55.8662727,18.5676545 L55.0791818,20.8651091 L51.7606364,20.8651091 L56.6320909,8.10092727 L59.9931818,8.10092727 L64.8651818,20.8651091 Z"
                  id="Fill-7_6722860941443"
                ></path>
                <polygon
                  id="Fill-9_6722860941443"
                  points="74.2670727 15.6317455 69.0759818 15.6317455 69.0759818 20.8653818 65.9914364 20.8653818 65.9914364 8.10065455 75.3519818 8.10065455 75.3519818 10.7597455 69.0759818 10.7597455 69.0759818 13.2066545 74.2670727 13.2066545"
                ></polygon>
                <polygon
                  id="Fill-11_6722860941443"
                  points="85.6902 15.6104182 80.4991091 15.6104182 80.4991091 18.2062364 86.6900182 18.2062364 86.6900182 20.8653273 77.4145636 20.8653273 77.4145636 8.1006 86.6900182 8.1006 86.6900182 10.7596909 80.4991091 10.7596909 80.4991091 13.1853273 85.6902 13.1853273"
                ></polygon>
                <path
                  d="M88.5453273,8.72618182 L88.5453273,8.94109091 L88.7215091,8.94109091 C88.8033273,8.94109091 88.8507818,8.90236364 88.8507818,8.83581818 C88.8507818,8.76436364 88.8033273,8.72618182 88.7215091,8.72618182 L88.5453273,8.72618182 Z M88.7313273,8.46381818 C88.9844182,8.46381818 89.1556909,8.60672727 89.1556909,8.82654545 C89.1556909,8.95527273 89.0989636,9.05563636 89.0084182,9.11727273 L89.0084182,9.12218182 L89.1747818,9.37036364 L89.1747818,9.42709091 L88.8698727,9.42709091 L88.7122364,9.19309091 L88.5453273,9.19309091 L88.5453273,9.42709091 L88.2546,9.42709091 L88.2546,8.46381818 L88.7313273,8.46381818 Z M88.6887818,8.058 C88.1733273,8.058 87.8296909,8.43054545 87.8296909,8.96454545 C87.8296909,9.47509091 88.1733273,9.87109091 88.6887818,9.87109091 C89.2135091,9.87109091 89.5566,9.48 89.5566,8.96454545 C89.5566,8.44963636 89.2135091,8.058 88.6887818,8.058 L88.6887818,8.058 Z M88.6887818,10.0761818 C88.0156909,10.0761818 87.6153273,9.56563636 87.6153273,8.96454545 C87.6153273,8.35909091 88.0156909,7.85290909 88.6887818,7.85290909 C89.3656909,7.85290909 89.7709636,8.35909091 89.7709636,8.96454545 C89.7709636,9.57054545 89.3656909,10.0761818 88.6887818,10.0761818 L88.6887818,10.0761818 Z"
                  id="Fill-13_6722860941443"
                ></path>
                <path
                  d="M4.20545455,4.52345455 C4.20545455,4.52345455 3.68181818,5.12945455 2.52818182,5.12945455 C0.941454545,5.12945455 9.9314496e-15,3.96709091 9.9314496e-15,2.55981818 C9.9314496e-15,1.15254545 0.941454545,-1.27897692e-13 2.52818182,-1.27897692e-13 C3.68181818,-1.27897692e-13 4.20545455,0.596727273 4.20545455,0.596727273 L3.52636364,1.50545455 C3.52636364,1.50545455 3.19909091,1.13672727 2.54454545,1.13672727 C1.77545455,1.13672727 1.22727273,1.71 1.22727273,2.55981818 C1.22727273,3.41127273 1.77545455,3.98454545 2.54454545,3.98454545 C3.19909091,3.98454545 3.52636364,3.61581818 3.52636364,3.61581818 L4.20545455,4.52345455 Z"
                  id="Fill-15_6722860941443"
                ></path>
                <path
                  d="M9.81021818,2.56003636 C9.81021818,1.70967273 9.23749091,1.14512727 8.50930909,1.14512727 C7.79749091,1.14512727 7.22476364,1.70967273 7.22476364,2.56003636 C7.22476364,3.41149091 7.79749091,3.97603636 8.50930909,3.97603636 C9.23749091,3.97603636 9.81021818,3.41149091 9.81021818,2.56003636 M5.99749091,2.56003636 C5.99749091,1.15276364 7.0284,0.000218181818 8.50930909,0.000218181818 C10.0060364,0.000218181818 11.0374909,1.15276364 11.0374909,2.56003636 C11.0374909,3.96730909 10.0060364,5.12967273 8.50930909,5.12967273 C7.0284,5.12967273 5.99749091,3.96730909 5.99749091,2.56003636"
                  id="Fill-17_6722860941443"
                ></path>
                <polygon
                  id="Fill-19_6722860941443"
                  points="17.1818727 2.30645455 16.1264182 3.71372727 15.6273273 3.71372727 14.5636909 2.29881818 14.5636909 5.01463636 13.3855091 5.01463636 13.3942364 0.105545455 14.3515091 0.105545455 15.8727818 2.20827273 17.3946 0.105545455 18.3518727 0.105545455 18.3600545 5.01463636 17.1818727 5.01463636"
                ></polygon>
                <path
                  d="M23.0726727,1.12821818 L22.1732182,1.12821818 L22.1732182,2.39694545 L23.0814,2.39694545 C23.4981273,2.39694545 23.8172182,2.17549091 23.8172182,1.75876364 C23.8172182,1.33276364 23.5063091,1.12821818 23.0726727,1.12821818 M25.0444909,1.75876364 C25.0444909,2.76458182 24.2835818,3.40276364 23.1544909,3.40276364 L22.1732182,3.40276364 L22.1732182,5.01458182 L20.9868545,5.01458182 L20.9868545,0.105490909 L23.1544909,0.105490909 C24.2754,0.105490909 25.0444909,0.800945455 25.0444909,1.75876364"
                  id="Fill-21_6722860941443"
                ></path>
                <path
                  d="M28.3008,3.19816364 L29.5444364,3.19816364 L28.9226182,1.3818 L28.3008,3.19816364 Z M31.4426182,5.01452727 L30.1662545,5.01452727 L29.8635273,4.13143636 L27.9817091,4.13143636 L27.6789818,5.01452727 L26.4031636,5.01452727 L28.2762545,0.105436364 L29.5689818,0.105436364 L31.4426182,5.01452727 Z"
                  id="Fill-23_6722860941443"
                ></path>
                <polygon
                  id="Fill-25_6722860941443"
                  points="32.6538 0.105490909 36.6050727 0.105490909 36.6050727 1.12821818 35.2223455 1.12821818 35.2223455 5.01458182 34.0359818 5.01458182 34.0359818 1.12821818 32.6538 1.12821818"
                ></polygon>
                <polygon
                  id="Fill-27_6722860941443"
                  points="38.9205273 5.01441818 40.1068909 5.01441818 40.1068909 0.105327273 38.9205273 0.105327273"
                ></polygon>
                <path
                  d="M43.9282909,2.97763636 L43.9282909,3.99163636 L45.0655636,3.99163636 C45.3846545,3.99163636 45.5973818,3.75545455 45.5973818,3.49309091 C45.5973818,3.24709091 45.4092,3.00218182 45.1146545,2.97763636 L43.9282909,2.97763636 Z M45.0001091,1.128 L43.9282909,1.128 L43.9282909,2.09454545 L44.9755636,2.09454545 C45.2782909,2.09454545 45.4828364,1.87309091 45.4828364,1.61945455 C45.4828364,1.35 45.2946545,1.128 45.0001091,1.128 L45.0001091,1.128 Z M45.0568364,5.01436364 L42.7419273,5.01436364 L42.7419273,0.105272727 L45.0246545,0.105272727 C46.1864727,0.105272727 46.7422909,0.613636364 46.7422909,1.44763636 C46.7422909,1.84854545 46.5219273,2.22436364 46.1619273,2.43763636 L46.1619273,2.50363636 C46.6201091,2.65036364 46.8732,3.05127273 46.8732,3.55090909 C46.8732,4.46672727 46.2186545,5.01436364 45.0568364,5.01436364 L45.0568364,5.01436364 Z"
                  id="Fill-29_6722860941443"
                ></path>
                <polygon
                  id="Fill-30_6722860941443"
                  points="49.2709636 5.01458182 49.2709636 0.105490909 50.4573273 0.105490909 50.4573273 3.99185455 52.6495091 3.99185455 52.6495091 5.01458182"
                ></polygon>
                <polygon
                  id="Fill-31_6722860941443"
                  points="58.1809636 2.99361818 56.1846 2.99361818 56.1846 3.9918 58.5649636 3.9918 58.5649636 5.01452727 54.9982364 5.01452727 54.9982364 0.105436364 58.5649636 0.105436364 58.5649636 1.12816364 56.1846 1.12816364 56.1846 2.06143636 58.1809636 2.06143636"
                ></polygon>
                <polygon
                  id="Fill-32_6722860941443"
                  points="66.9598909 2.25747273 66.1417091 5.01474545 65.2248 5.01474545 63.7935273 0.105654545 65.0944364 0.105654545 65.7162545 2.70801818 66.5175273 0.105654545 67.4017091 0.105654545 68.2198909 2.72383636 68.8575273 0.105654545 70.1671636 0.105654545 68.7353455 5.01474545 67.8184364 5.01474545"
                ></polygon>
                <polygon
                  id="Fill-33_6722860941443"
                  points="72.3759818 5.01441818 73.5623455 5.01441818 73.5623455 0.105327273 72.3759818 0.105327273"
                ></polygon>
                <polygon
                  id="Fill-34_6722860941443"
                  points="75.8778545 0.105490909 79.8296727 0.105490909 79.8296727 1.12821818 78.4469455 1.12821818 78.4469455 5.01458182 77.2605818 5.01458182 77.2605818 1.12821818 75.8778545 1.12821818"
                ></polygon>
                <polygon
                  id="Fill-35_6722860941443"
                  points="86.5307455 5.02309091 85.3443818 5.02309091 85.3443818 3.02672727 83.3316545 3.02672727 83.3316545 5.02309091 82.1452909 5.02309091 82.1452909 0.105272727 83.3316545 0.105272727 83.3316545 2.09454545 85.3443818 2.09454545 85.3443818 0.105272727 86.5307455 0.105272727"
                ></polygon>
              </g>
            </g>
          </g>
        </svg>
      `;
    },
  },
  samsungLabel: {
    render: function (html, args) {
      return html`
        <svg
          width="90px"
          height="30px"
          viewBox="0 0 90 30"
          version="1.1"
          xmlns="http://www.w3.org/2000/svg"
          xmlns:xlink="http://www.w3.org/1999/xlink"
          role="img"
          aria-labelledby="flagTitle_6731014832259"
        >
          <title id="flagTitle_6731014832259">Designed for Samsung</title>
          <defs>
            <polygon
              id="path-1_6731014832259"
              points="0 0.169746429 23.29605 0.169746429 23.29605 21.8355238 0 21.8355238"
            ></polygon>
            <polygon
              id="path-3_6731014832259"
              points="0 29.7230786 89.8871786 29.7230786 89.8871786 0.321364286 0 0.321364286"
            ></polygon>
          </defs>
          <g
            id="Design_6731014832259"
            stroke="none"
            stroke-width="1"
            fill="none"
            fill-rule="evenodd"
          >
            <g
              id="product-flags_6731014832259"
              transform="translate(-869.000000, -94.000000)"
            >
              <g
                id="designed-for-samsung_6731014832259"
                transform="translate(869.000000, 94.000000)"
              >
                <path
                  d="M24.334425,13.5972643 C24.379425,14.05305 24.4077107,14.5101214 24.4077107,14.9829429 C24.4077107,23.1308357 17.9026393,29.7230143 9.96013929,29.7230143 L0.739960714,29.7230143 C0.329175,29.7230143 3.21428571e-05,29.3459786 3.21428571e-05,28.92555 L3.21428571e-05,21.1051929 L8.29449643,24.9019071 C9.045675,25.2451929 9.82224643,25.4043 10.5988179,25.4043 C12.7202464,25.4043 14.7571393,24.1803 15.685425,22.1167286 L15.9052821,21.6326571 C16.5211393,20.27655 16.571925,18.7500857 16.0486393,17.3435143 C15.5253536,15.9366214 14.4926036,14.8196571 13.1393893,14.1993 L9.113175,12.3607286 C8.01581786,11.85705 7.529175,10.5459429 8.03285357,9.44569286 L8.36488929,8.7003 C8.606925,8.17122857 9.03988929,7.76044286 9.59146071,7.55794286 C10.1401393,7.34676429 10.7338179,7.36669286 11.2625679,7.6113 L24.334425,13.5972643 Z"
                  id="Fill-1_6731014832259"
                  fill="#231F20"
                ></path>
                <g
                  id="Group-5_6731014832259"
                  transform="translate(0.000000, 0.151650)"
                >
                  <mask id="mask-2_6731014832259" fill="white">
                    <use xlink:href="#path-1"></use>
                  </mask>
                  <g id="Clip-4_6731014832259"></g>
                  <path
                    d="M12.5963357,20.5483179 L12.8158714,20.0671393 C13.0550143,19.5383893 13.0746214,18.9418179 12.8692286,18.3902464 C12.6609429,17.8361036 12.2585143,17.399925 11.7297643,17.1578893 L7.70355,15.3167464 C4.90390714,14.0323179 3.66062143,10.6981393 4.93508571,7.88178214 L5.27258571,7.13349643 C5.89165714,5.77031786 7.00026429,4.73049643 8.39847857,4.20303214 C9.79669286,3.67556786 11.3135143,3.73181786 12.6696214,4.34799643 L23.29605,9.21121071 C21.1129071,3.91471071 15.9443357,0.169746429 9.95997857,0.169746429 L0.740121429,0.169746429 C0.329335714,0.169746429 -0.000128571429,0.549675 -0.000128571429,0.968817857 L-0.000128571429,17.197425 L9.70412143,21.6373179 C10.7982643,22.1409964 12.09555,21.6511393 12.5963357,20.5483179"
                    id="Fill-3_6731014832259"
                    fill="#231F20"
                    mask="url(#mask-2)"
                  ></path>
                </g>
                <path
                  d="M31.6412357,10.5656786 L31.1459143,10.5656786 L31.1459143,6.05957143 L31.5933429,6.05957143 C33.2785929,6.05957143 34.0863429,6.99235714 34.0863429,8.30925 C34.0863429,9.59207143 33.1378071,10.5656786 31.6412357,10.5656786 M31.7395929,4.86257143 L29.8743429,4.86257143 L29.8743429,11.7530357 L31.7958429,11.7530357 C33.8780571,11.7530357 35.3608071,10.2702857 35.3608071,8.30925 C35.3608071,6.35946429 34.0439143,4.86257143 31.7395929,4.86257143"
                  id="Fill-6_6731014832259"
                  fill="#231F20"
                ></path>
                <path
                  d="M37.1389179,8.37806786 C37.3668107,7.70563929 37.9575964,7.24278214 38.7174536,7.24278214 C39.505275,7.24278214 40.0706679,7.64231786 40.2535607,8.37806786 L37.1389179,8.37806786 Z M41.5363821,8.96178214 C41.5363821,7.33278214 40.3519179,6.12003214 38.7174536,6.12003214 C37.1109536,6.12003214 35.8673464,7.39481786 35.8673464,9.00838929 C35.8673464,10.6036393 37.0402393,11.8697464 38.765025,11.8697464 C39.9835607,11.8697464 40.8501321,11.2632107 41.3197393,10.3786393 L40.281525,9.77210357 C40.0198821,10.3561393 39.4657393,10.7457107 38.765025,10.7457107 C37.8675964,10.7457107 37.2488464,10.2137464 37.079775,9.441675 L41.5363821,9.441675 L41.5363821,8.96178214 Z"
                  id="Fill-8_6731014832259"
                  fill="#231F20"
                ></path>
                <path
                  d="M41.8177607,10.5262071 L42.9938679,9.96049286 C43.2555107,10.47285 43.7225464,10.76535 44.316225,10.76535 C44.9352964,10.76535 45.2560821,10.4529214 45.2560821,10.0929214 C45.2560821,9.69917143 44.6427964,9.60499286 43.9758321,9.46002857 C43.0221536,9.27135 42.0456536,8.94927857 42.0456536,7.80274286 C42.0456536,6.91367143 42.889725,6.10045714 44.203725,6.11299286 C45.2898321,6.11299286 46.0214036,6.55206429 46.4489036,7.25406429 L45.3685821,7.80274286 C45.1432607,7.41574286 44.7327964,7.17242143 44.203725,7.17242143 C43.6045821,7.17242143 43.3259036,7.4511 43.3259036,7.76063571 C43.3259036,8.12899286 43.7646536,8.22349286 44.5836536,8.40606429 C45.4781893,8.59602857 46.5109393,8.90845714 46.5109393,10.06335 C46.5109393,10.8370286 45.8269393,11.8794214 44.259975,11.8697786 C43.0587964,11.8697786 42.259725,11.3956714 41.8177607,10.5262071"
                  id="Fill-10"
                  fill="#231F20"
                ></path>
                <path
                  d="M47.7882321,4.08455357 C48.286125,4.08455357 48.5844107,4.40533929 48.5844107,4.88491071 C48.5844107,5.35483929 48.286125,5.675625 47.7882321,5.675625 C47.2816607,5.675625 46.9862679,5.35483929 46.9862679,4.88491071 C46.9862679,4.40533929 47.2958036,4.08455357 47.7882321,4.08455357"
                  id="Fill-12"
                  fill="#231F20"
                ></path>
                <mask id="mask-4_6731014832259" fill="white">
                  <use xlink:href="#path-3"></use>
                </mask>
                <g id="Clip-15_6731014832259"></g>
                <polygon
                  id="Fill-14_6731014832259"
                  fill="#231F20"
                  mask="url(#mask-4)"
                  points="47.1493929 11.7529714 48.4238571 11.7529714 48.4238571 6.23275714 47.1493929 6.23275714"
                ></polygon>
                <path
                  d="M51.9690857,10.6979143 C51.02955,10.6979143 50.3092286,9.94384286 50.3092286,8.98148571 C50.3092286,8.02780714 51.02955,7.28241429 51.9690857,7.28241429 C52.9031571,7.28241429 53.6122286,8.04741429 53.6122286,8.98148571 C53.6122286,9.93259286 52.9031571,10.6979143 51.9690857,10.6979143 L51.9690857,10.6979143 Z M53.5447286,6.23262857 L53.5447286,6.9417 C53.1506571,6.43962857 52.5036214,6.12012857 51.7861929,6.12012857 C50.3963357,6.12012857 49.0627286,7.17248571 49.0627286,8.99980714 C49.0627286,10.80495 50.4413357,11.8695214 51.7636929,11.8695214 C52.4952643,11.8695214 53.1506571,11.5390929 53.5530857,11.0187 L53.5530857,11.6557714 C53.5530857,12.5043429 52.9539429,13.2552 51.99705,13.2552 C51.1250143,13.2552 50.6862643,12.8868429 50.2893,12.1482 L49.1610857,12.8447357 C49.67055,13.7675571 50.5538357,14.4258429 51.9774429,14.4258429 C53.8401214,14.4258429 54.8137286,13.1639143 54.8137286,11.6123786 L54.8137286,6.23262857 L53.5447286,6.23262857 Z"
                  id="Fill-16_6731014832259"
                  fill="#231F20"
                  mask="url(#mask-4)"
                ></path>
                <path
                  d="M55.7082964,6.23266071 L56.9602607,6.23266071 L56.9602607,6.91376786 C57.3231536,6.43258929 57.9001179,6.12016071 58.6005107,6.12016071 C59.9453679,6.12016071 60.7756179,7.01083929 60.7756179,8.48073214 L60.7756179,11.752875 L59.4895821,11.752875 L59.4895821,8.61026786 C59.4895821,7.76041071 59.0816893,7.22458929 58.2517607,7.22458929 C57.5314393,7.22458929 56.9686179,7.76041071 56.9686179,8.72855357 L56.9686179,11.752875 L55.7082964,11.752875 L55.7082964,6.23266071 Z"
                  id="Fill-17_6731014832259"
                  fill="#231F20"
                  mask="url(#mask-4)"
                ></path>
                <path
                  d="M62.6886964,8.37806786 C62.9194821,7.70563929 63.507375,7.24278214 64.2643393,7.24278214 C65.0521607,7.24278214 65.6120893,7.64231786 65.8004464,8.37806786 L62.6886964,8.37806786 Z M67.0890536,8.96178214 C67.0890536,7.33278214 65.8962321,6.12003214 64.2643393,6.12003214 C62.6607321,6.12003214 61.417125,7.39481786 61.417125,9.00838929 C61.417125,10.6036393 62.5874464,11.8697464 64.3122321,11.8697464 C65.5333393,11.8697464 66.394125,11.2632107 66.8698393,10.3786393 L65.831625,9.77210357 C65.5725536,10.3561393 65.0155179,10.7457107 64.3122321,10.7457107 C63.4090179,10.7457107 62.7928393,10.2137464 62.6240893,9.441675 L67.0890536,9.441675 L67.0890536,8.96178214 Z"
                  id="Fill-18_6731014832259"
                  fill="#231F20"
                  mask="url(#mask-4)"
                ></path>
                <path
                  d="M70.4823107,10.6979143 C69.5424536,10.6979143 68.825025,9.94384286 68.825025,8.98148571 C68.825025,8.02780714 69.5424536,7.28241429 70.4823107,7.28241429 C71.4218464,7.28241429 72.1254536,8.04741429 72.1254536,8.98148571 C72.1254536,9.93259286 71.4218464,10.6979143 70.4823107,10.6979143 L70.4823107,10.6979143 Z M72.0495964,4.65987857 L72.0495964,6.88255714 C71.6584179,6.41262857 71.0113821,6.12012857 70.2910607,6.12012857 C68.9066679,6.12012857 67.5788464,7.17248571 67.5788464,8.99980714 C67.5788464,10.80495 68.9574536,11.8695214 70.2769179,11.8695214 C70.9972393,11.8695214 71.6584179,11.5503429 72.0608464,11.0367 L72.0608464,11.7528429 L73.3269536,11.7528429 L73.3269536,4.65987857 L72.0495964,4.65987857 Z"
                  id="Fill-19_6731014832259"
                  fill="#231F20"
                  mask="url(#mask-4)"
                ></path>
                <path
                  d="M76.4216357,6.19045714 L77.3502429,6.19045714 L77.3502429,6.18499286 C77.3502429,4.59520714 77.9805643,3.97613571 79.6487786,3.97613571 L79.7583857,3.97613571 L79.7583857,5.15513571 C78.7542429,5.15513571 78.6359571,5.39138571 78.6359571,6.19045714 L79.7583857,6.19045714 L79.7583857,7.33570714 L78.6359571,7.33570714 L78.6359571,11.7135643 L77.3502429,11.7135643 L77.3502429,7.33570714 L76.4216357,7.33570714 L76.4216357,6.19045714 Z"
                  id="Fill-20_6731014832259"
                  fill="#231F20"
                  mask="url(#mask-4)"
                ></path>
                <path
                  d="M82.7718107,10.6289036 C81.8602393,10.6289036 81.1765607,9.87611786 81.1765607,8.95618929 C81.1765607,8.03336786 81.8602393,7.27801071 82.7718107,7.27801071 C83.6608821,7.27801071 84.3641679,8.03336786 84.3641679,8.95618929 C84.3641679,9.87611786 83.6608821,10.6289036 82.7718107,10.6289036 M82.7718107,6.08068929 C81.1907036,6.08068929 79.9300607,7.35515357 79.9300607,8.95618929 C79.9300607,10.5514393 81.1907036,11.826225 82.7718107,11.826225 C84.3503464,11.826225 85.6106679,10.5514393 85.6106679,8.95618929 C85.6106679,7.35515357 84.3503464,6.08068929 82.7718107,6.08068929"
                  id="Fill-21_6731014832259"
                  fill="#231F20"
                  mask="url(#mask-4)"
                ></path>
                <path
                  d="M86.2577679,6.19045714 L87.5180893,6.19045714 L87.5180893,7.01781429 C87.771375,6.46495714 88.2300536,6.19045714 88.9195179,6.19045714 C89.3190536,6.19045714 89.6453036,6.28624286 89.8873393,6.43088571 L89.4090536,7.63688571 C89.220375,7.51699286 89.0095179,7.41574286 88.6520893,7.41574286 C87.9234107,7.41574286 87.5209821,7.81817143 87.5209821,8.77345714 L87.5209821,11.7135643 L86.2577679,11.7135643 L86.2577679,6.19045714 Z"
                  id="Fill-22_6731014832259"
                  fill="#231F20"
                  mask="url(#mask-4)"
                ></path>
                <path
                  d="M86.6629929,20.2442143 L86.6629929,21.4990714 L87.5379214,21.4990714 L87.5379214,22.7426786 C87.5379214,22.8526071 87.53535,22.9734643 87.5183143,23.0718214 C87.4787786,23.2997143 87.2621357,23.6963571 86.6404929,23.6963571 C86.0214214,23.6963571 85.8047786,23.2997143 85.7681357,23.0718214 C85.7514214,22.9734643 85.7459571,22.8526071 85.7459571,22.7426786 L85.7459571,18.8135357 C85.7459571,18.6743571 85.7543143,18.5210357 85.7822786,18.4085357 C85.8272786,18.1986429 86.0130643,17.7823929 86.6350286,17.7823929 C87.2875286,17.7823929 87.4508143,18.2185714 87.4874571,18.4085357 C87.5125286,18.5306786 87.5183143,18.7376786 87.5183143,18.7376786 L87.5183143,19.2143571 L89.6677071,19.2143571 L89.6677071,18.9331071 C89.6677071,18.9331071 89.6763857,18.6377143 89.6509929,18.3648214 C89.4934929,16.7496429 88.1682429,16.2379286 86.6517429,16.2379286 C85.1352429,16.2379286 83.8437429,16.7554286 83.6553857,18.3648214 C83.6354571,18.5110714 83.6074929,18.7781786 83.6074929,18.9331071 L83.6074929,22.5469286 C83.6074929,22.7076429 83.6129571,22.8227143 83.6412429,23.1155357 C83.7820286,24.6853929 85.1352429,25.2411429 86.6462786,25.2411429 C88.1682429,25.2411429 89.5102071,24.6853929 89.6509929,23.1155357 C89.6789571,22.8227143 89.6789571,22.7076429 89.6876357,22.5469286 L89.6876357,20.2442143 L86.6629929,20.2442143 Z M71.8158857,16.47 L69.65235,16.47 L69.65235,22.8326786 C69.6552429,22.9426071 69.65235,23.0718214 69.6324214,23.1589286 C69.5877429,23.373 69.4103143,23.7834643 68.8082786,23.7834643 C68.2203857,23.7834643 68.0371714,23.373 67.9950643,23.1589286 C67.9725643,23.0718214 67.9725643,22.9426071 67.9725643,22.8326786 L67.9725643,16.47 L65.8090286,16.47 L65.8090286,22.6343571 C65.8090286,22.7960357 65.8202786,23.1181071 65.8315286,23.2026429 C65.9806714,24.8104286 67.2381,25.3369286 68.8082786,25.3369286 C70.3868143,25.3369286 71.6442429,24.8104286 71.7962786,23.2026429 C71.8075286,23.1181071 71.8216714,22.7960357 71.8158857,22.6343571 L71.8158857,16.47 Z M51.9438857,16.47 L50.8661357,23.1913929 L49.7887071,16.47 L46.3024929,16.47 L46.1141357,25.0723929 L48.2522786,25.0723929 L48.3117429,17.1099643 L49.78035,25.0723929 L51.94935,25.0723929 L53.4182786,17.1099643 L53.4742071,25.0723929 L55.6181357,25.0723929 L55.4268857,16.47 L51.9438857,16.47 Z M39.0295286,16.47 L37.4455286,25.0723929 L39.7585286,25.0723929 L40.9484571,17.1099643 L42.1133143,25.0723929 L44.4092786,25.0723929 L42.8307429,16.47 L39.0295286,16.47 Z M79.3733143,23.3955 L77.3557071,16.47 L74.1848143,16.47 L74.1848143,24.9849643 L76.2837429,24.9849643 L76.1599929,17.83575 L78.3235286,24.9849643 L81.3677786,24.9849643 L81.3677786,16.47 L79.2550286,16.47 L79.3733143,23.3955 Z M59.9567786,18.7093929 C59.9146714,18.5390357 59.9284929,18.35775 59.9455286,18.2635714 C60.0101357,17.9877857 60.1930286,17.6895 60.7221,17.6895 C61.2199929,17.6895 61.5044571,17.9990357 61.5044571,18.4631786 L61.5044571,18.9893571 L63.6143143,18.9893571 L63.6143143,18.3902143 C63.6143143,16.5358929 61.9628143,16.2433929 60.7671,16.2433929 C59.26185,16.2433929 58.0323857,16.7441786 57.8044929,18.1382143 C57.74535,18.5181429 57.7341,18.85725 57.8269929,19.2876429 C58.1956714,21.0236786 61.2032786,21.5270357 61.6391357,22.6243929 C61.7153143,22.8355714 61.6957071,23.1026786 61.6561714,23.2605 C61.5857786,23.54175 61.3974214,23.83425 60.8291357,23.83425 C60.3000643,23.83425 59.9792786,23.5276071 59.9792786,23.0576786 L59.9792786,22.2361071 L57.7087071,22.2361071 L57.7087071,22.8889286 C57.7087071,24.7908214 59.1885643,25.3648929 60.7812429,25.3648929 C62.3089929,25.3648929 63.5722071,24.84 63.7747071,23.4167143 C63.8704929,22.68225 63.7972071,22.20525 63.7551,22.0223571 C63.4034571,20.2413214 60.1988143,19.7038929 59.9567786,18.7093929 L59.9567786,18.7093929 Z M32.1477429,18.6910714 C32.1082071,18.5139643 32.1168857,18.3294643 32.1393857,18.2381786 C32.1982071,17.9623929 32.3839929,17.6570357 32.9214214,17.6570357 C33.4193143,17.6570357 33.7176,17.9681786 33.7176,18.4406786 L33.7176,18.96975 L35.8502786,18.96975 L35.8502786,18.3677143 C35.8502786,16.4950714 34.1704929,16.1926071 32.9606357,16.1926071 C31.4444571,16.1926071 30.2034214,16.7020714 29.9755286,18.1086429 C29.9138143,18.4956429 29.9025643,18.83475 29.9896714,19.2693214 C30.3638143,21.0236786 33.4054929,21.5328214 33.8442429,22.6468929 C33.9287786,22.8526071 33.9004929,23.1181071 33.8612786,23.2813929 C33.7908857,23.5713214 33.5996357,23.8654286 33.0255643,23.8654286 C32.4910286,23.8654286 32.1728143,23.5488214 32.1728143,23.0805 L32.16735,22.2518571 L29.8742786,22.2518571 L29.8742786,22.9114286 C29.8742786,24.83325 31.3766357,25.4098929 32.9831357,25.4098929 C34.5279214,25.4098929 35.7969214,24.8837143 36.0052071,23.4417857 C36.1035643,22.7005714 36.0302786,22.2177857 35.9939571,22.0307143 C35.6336357,20.2287857 32.3897786,19.6955357 32.1477429,18.6910714 L32.1477429,18.6910714 Z"
                  id="Fill-23_6731014832259"
                  fill="#231F20"
                  mask="url(#mask-4)"
                ></path>
              </g>
            </g>
          </g>
        </svg>
      `;
    },
  }
}

// VARIABLES
TagalysCustomizations.variables = {
  MAX_PRODUCT_SUGGESTIONS: 4,
  MAX_TEXT_SUGGESTIONS: 4,
  SEARCH_SUGGESTIONS_INPUT_SELECTOR: ".site-header__search-input",
  SEARCH_SUGGESTIONS_ALIGN_TO_SELECTOR: ".site-header__search-form",
  SEARCH_RESULTS_URL: "/pages/search",
  SEARCH_RESULTS_SELECTOR: ".search-results-container"
}

// SEARCH SUGGESTIONS
TagalysCustomizations.initSearchSuggestions = function () {
  Tagalys.UIWidgets.SearchSuggestions.init(TagalysCustomizations.variables.SEARCH_SUGGESTIONS_INPUT_SELECTOR, {
    searchResultsURL: TagalysCustomizations.variables.SEARCH_RESULTS_URL,
    templates: {
      ...TagalysCustomizations.commonTemplates,
      widget: {
        options: {
          queriesLimit: TagalysCustomizations.variables.MAX_TEXT_SUGGESTIONS,
          productsLimit: TagalysCustomizations.variables.MAX_PRODUCT_SUGGESTIONS,
          alignToSelector: TagalysCustomizations.variables.SEARCH_SUGGESTIONS_ALIGN_TO_SELECTOR,
          includeTagalysCSS: ["layout"]
        },
        render: function (html, args) {
          var props = args.props;
          var helpers = props.helpers;
          var width = helpers.getTargetNodeWidth()
          var style = props.inheritAlignmentElementWidth ? { width: width } : {}
          return html`
            <div ref=${props.tagalysSearchSuggestionsPopoverRef} style=${style} class="search-suggestions">
              <div class="container">
                ${helpers.exceedsMinimumCharactersToShowSuggestions()
                  ? html` <${args.templates.typeSuggestions} /> `
                  : null
                }
              </div>
            </div>
          `;
        }
      },
      clickSuggestions: {
        render: function (html, args) {
          var helpers = args.props.helpers
          var recentAndPopularSearches = helpers.getRecentAndPopularSearches()
          var hasRecentSearches = recentAndPopularSearches.recentSearches.length > 0
          var hasPopularSearches = recentAndPopularSearches.popularSearches.length > 0
          return html`
            ${hasRecentSearches ? html `<p class="h6 click-suggestions-label suggestions-label">Recent searches:</p>` : null}
            <ul class="click-suggestions">
              ${recentAndPopularSearches.recentSearches.map(
                recentSearch =>
                  html`
                    <${args.templates.recentSearchItem} recentSearch=${recentSearch} />
                  `
              )}
            ${hasPopularSearches ? html `<p class="h6 click-suggestions-label suggestions-label">Popular searches:</p>`  : null}
            ${recentAndPopularSearches.popularSearches.map(
              popularSearch =>
                html`
                  <${args.templates.popularSearchItem} popularSearch=${popularSearch} />
                `
            )}
            </ul>
          `;
        }
      },
      typeSuggestions: {
        render: function (html, args) {
          var props = args.props
          var helpers = props.helpers
          var textSuggestions = helpers.getTextSuggestions()
          var products = helpers.getProducts()
          var classes = ["type-suggestions"]
          if (helpers.hasTextSearchSuggestions() > 0) {
            classes.push("product-and-text-suggestions")
          } else {
            classes.push("product-suggestions")
          }
          var className = classes.join(" ")

          return html`
            <div class=${className}>
              <${args.templates.products}
                class="product-suggestions"
              />
              ${helpers.hasTextSearchSuggestions() ?
                html`
                  <div class="text-suggestions-container">
                    <p class="h6 suggestions-label">Recommended Searches:</p>
                    <ul class="text-suggestions">
                      ${textSuggestions.map(
                        textSuggestion =>
                          html`
                            <${args.templates.textSuggestionItem} textSuggestion=${textSuggestion} />
                          `
                      )}
                    </ul>
                  </div>
                `: null
              }
            </div>
            ${products.length > 0 ? html`
              <div class="view-more">
                <button class="btn btn-small" onClick=${function () {
                  helpers.onSearchSubmit(helpers.getEnteredSearchQuery())
                }}> View more </button>
              </div>
              ` :
              null
            }
        `;
        }
      },
      products: {
        callbacks: {
          afterEveryRender: function(helpers) {
            TagalysCustomizations.utilities.initProductRatings(helpers, {
              baseSelector: ".search-suggestions",
              widgetContext: "search-suggestions"
            })
          }
        }
      },
      product: {
        render: function (html, args) {
          return TagalysCustomizations.utilities.productRenderer(html, args, {
            query: args.props.helpers.getEnteredSearchQuery(),
            namespace: ".search-suggestions",
            widgetContext: "search-suggestions"
          })
        }
      },
    },
  });
}
// SEARCH
TagalysCustomizations.initSearchResults = function() {
  Tagalys.UIWidgets.SearchResults.init(TagalysCustomizations.variables.SEARCH_RESULTS_SELECTOR, {
    templates: {
      ...TagalysCustomizations.commonTemplates,
      rangeSliderFilterItem: {
        render: function (html, args) {
          var props = args.props;
          var helpers = props.helpers;
          var labels = args.labels

          return html`
            <div class="range-slider filter-item">
              <div class="input-group">
                <div class="input-container">
                  <input
                    type="number"
                    value=${props.sliderInputValues[0]}
                    onblur=${props.onInputBlur}
                    onchange=${props.onMinChange}
                  />
                </div>
                <span class="to"> - </span>
                <div class="input-container">
                  <input
                    type="number"
                    value=${props.sliderInputValues[1]}
                    onblur=${props.onInputBlur}
                    onchange=${props.onMaxChange}
                  />
                </div>
              </div>
              <div ref=${props.sliderRef} />
            </div>
          `;
        },
      },
      loader: {
        render: function (html, args) {
          return html `
            <div class="loading" style="">
              <span class="loading-icon"></span>
            </div>
          `
        }
      },
      widget: {
        labels: {
          searchResults: {
            heading: {
              standard: `Search results for “{{searchTerm}}”`,
            },
            noResultsHeading: "Sorry! No Products Found."
          },
          filters: {
            heading: "FILTER",
            clearAllFilters: 'Clear All'
          },
        },
        options: {
          includeTagalysCSS: ["layout"]
        },
        render: function (html, args) {
          var props = args.props;
          var helpers = props.helpers;

          if (helpers.isInitialLoading()) {
            return html`<div class="plp search-results"> <${args.templates.loader} /> </div>`;
          }

          let classes = ["plp", "search-results"];
          if (helpers.isFilterDrawerOpen()) {
            classes.push("filter-drawer-opened");
          }

          if (helpers.canShowFiltersInDrawer()) {
            classes.push("show-filters-in-drawer");
          }

          var className = classes.join(" ");

          if (helpers.hasNoSearchResults()) {
            return html`
              <div class="plp search-results">
                <${args.templates.noResults} />
              </div>
            `;
          }

          return html`
            <div class=${className}>
              <${args.templates.header} />
              ${helpers.isLoading() ? html` <${args.templates.loader} />
              ` : null}
              ${helpers.isFilterDrawerOpen() ? html` <div class="filter-overlay" onclick=${helpers.closeFilterDrawer}/>` : null}
              <div class="filters-and-products-list">
                <${args.templates.filters} />
                <div class="products-list">
                  <${args.templates.productListHeader} />
                  <${args.templates.products} />
                  <${args.templates.productListFooter} />
                </div>
              </div>
              <${args.templates.footer} />
            </div>
          `;
        }
      },
      infoAndActions: {
        render: function (html, args) {
          var props = args.props
          var helpers = props.helpers
          var labels = args.labels
          var filterOptions = helpers.getTemplateOptions('filters')

          var getResultsLabel = () => {
            return labels.searchResults.productsCount.replace("{{productsCount}}", helpers.getTotalProductsCount())
          }

          return html`
            <div class="plp-info-and-actions">
              <div class="results-count-and-filter-toggle">
                <strong class="results-count">${getResultsLabel()}</strong>
                <button
                  onclick=${helpers.openFilterDrawer}
                  class="filter-drawer-toggle"
                >
                <svg aria-hidden="true" focusable="false" role="presentation" class="icon icon-filter" viewBox="0 0 64 64"><path d="M48 42h10M48 42a5 5 0 1 1-5-5 5 5 0 0 1 5 5zM7 42h31M16 22H6M16 22a5 5 0 1 1 5 5 5 5 0 0 1-5-5zM57 22H26"></path></svg>
                  ${labels.filters.drawerFilterToggle}
                </button>
              </div>
              ${filterOptions.includeSortOptionsInFilters ? null : html` <${args.templates.sortOptions} /> `}
            </div>
          `;
        },
      },
      sortOptions: {
        render: function (html, args) {
          var props = args.props;
          var labels = args.labels;
          var helpers = props.helpers;
          var sortOptions = helpers.getSortOptions();
          var appliedSortOption = helpers.getAppliedSortOption();

          var applySortOption = (event) => {
            helpers.applySortOption(event.target.value);
          };

          return html`
            <div class="sort-options-container">
              <select
                class="sort-options"
                value=${appliedSortOption.id}
                onchange=${applySortOption}
              >
                ${sortOptions.map((sortOption) => {
                  return html`
                    <option value=${sortOption.id}>${sortOption.label}</option>
                  `;
                })}
              </select>
            </div>
          `;
        },
      },
      product: {
        render: function (html, args) {
          return TagalysCustomizations.utilities.productRenderer(html, args, {
            query: args.props.helpers.getQuery(),
            namespace: ".search-results-container",
            widgetContext: "search-results"
          })
        }
      },
      checkboxFilterItem: {
        render: function (html, args) {
          var props = args.props;
          var helpers = props.helpers;

          const onFilterClick = (event) => {
            event.stopPropagation();
            if (props.filterItem.selected) {
              helpers.clearFilter(props.filterId, props.filterItem.id);
            } else {
              helpers.applyFilter(props.filterId, props.filterItem.id);
            }
          };

          return html`
            <li
              class="filter-item${props.filterItem.selected ? " selected" : ""}"
              data-filter-item-id=${props.filterItem.id}
              onClick=${onFilterClick}
            >
              <span class="filter-checkbox-and-label">
                <span class="checkbox"></span>
                <span class="filter-item-label-and-count">
                  <span class="filter-item-label"
                    >${props.filterItem.name}</span
                  >
                  ${props.showMatchingProductsCount
                    ? html`
                        <span
                          class="filter-item-count"
                          aria-label=${`Number of products: (${props.filterItem.count})`}
                        >
                            (${props.filterItem.count})
                        </span>
                      `
                    : null}
                </span>
              </span>
              ${props.children}
            </li>
          `;
        },
      },
      filterHeader: {
        render: function (html, args) {
          var props = args.props;
          var helpers = props.helpers;
          var labels = args.labels;
          var filterOptions = helpers.getTemplateOptions("filters");
          var showClearActionForIndividualFilters =
            filterOptions.showClearActionForIndividualFilters &&
            helpers.isFilterApplied(props.filterId);
          var toggleCollapsibleFilter = () => {
            helpers.toggleCollapsibleFilter(props.filterId);
          };
          var clearFilter = (event) => {
            event.stopPropagation();
            helpers.clearFilter(props.filterId);
          };
          return html`
            <div
              onClick=${filterOptions.collapsible
                ? toggleCollapsibleFilter
                : undefined}
              class="filter-header"
            >
              <h3 class="filter-heading" aria-label=${`Filter by ${props.filterHeading}`}>${props.filterHeading}</h3>
              <div class="filter-actions">
                <span class="filter-action-toggle-collapse">
                  ${filterOptions.collapsible
                    ? html` <${args.templates.downArrow} /> `
                    : null}
                </span>
              </div>
            </div>
            ${showClearActionForIndividualFilters
              ? html`
                  <div onClick=${clearFilter} class="filter-action-clear" aria-label=${`Clear filter by ${props.filterHeading}`}>
                    ${labels.filters.clearIndividualFilter}
                  </div>
                `
              : null}
          `;
        },
      },
      filtersHeader: {
        render: function (html, args) {
          var props = args.props;
          var labels = args.labels;
          var helpers = props.helpers;
          var appliedFilters = helpers.getAppliedFilters(true);
          var showClearAllFiltersAction = appliedFilters.length;

          return html`
            <div class="filters-header">
              <div class="filters-heading-and-close-action">
                <span class="filters-heading">${labels.filters.heading}</span>
                <${args.templates.closeIcon}
                  onClick=${props.helpers.closeFilterDrawer}
                />
              </div>
              <div class="sub-header">
                ${props.helpers.getAppliedFilters().length > 0
                  ? html`<span class="refine-by-heading"
                      >REFINE BY</span
                    >`
                  : null}
                ${showClearAllFiltersAction
                  ? html`
                      <div
                        class="clear-all-filters"
                        aria-label="Clear all filters"
                        onclick=${helpers.clearAllFilters}
                      >
                        ${labels.filters.clearAllFilters}
                      </div>
                    `
                  : null}
              </div>
            </div>
          `;
        },
      },
      filters: {
        options: {
          autoCollapse: true,
          expandTopNFiltersByDefault: 1
        },
        render: function (html, args) {
          var props = args.props;
          var helpers = props.helpers;
          var filters = helpers.getFilters();
          var classes = ["filters"];
          if (props.collapsible) {
            classes.push("collapsible");
          }

          var className = classes.join(" ");
          return html`
            <div class=${className}>
              <${args.templates.filtersHeader} />
              ${props.showAppliedFilters
                ? html` <${args.templates.appliedFilters} /> `
                : null}
              ${props.includeSortOptionsInFilters === "top"
                ? html` <${args.templates.sortOptionInFilters} /> `
                : null}
                <div class="filters-container">
                  ${filters.map(
                    (filter) => html`<${args.templates.filter} filter=${filter} />`
                  )}
                  ${props.includeSortOptionsInFilters === true ||
                  props.includeSortOptionsInFilters === "bottom"
                    ? html` <${args.templates.sortOptionInFilters} /> `
                    : null}
                </div>
            </div>
          `;
        },
      },
      appliedFilters: {
        render: function (html, args) {
          var props = args.props;
          var helpers = props.helpers;
          var appliedFilters = helpers.getAppliedFilters(true);
          if (!appliedFilters.length) return null;
          return html`
            <ul class="applied-filters">
              ${appliedFilters.map((appliedFilter) => {
                var filter = props.helpers.getFilterById(appliedFilter.id);
                if (appliedFilter.type === "range") {
                  return html`
                    <li
                      onClick=${() => helpers.clearFilter(appliedFilter.id)}
                      class="applied-filter"
                      aria-label=${`Clear filter by ${filter.name}`}
                    >
                      <span class="applied-filter-label">
                        <span>
                           <span class="applied-filter-name">
                            ${filter.name}:
                          </span>
                          <span class="applied-filter-item-name">
                            ${helpers.labelFormatter(
                              appliedFilter.display_format,
                              appliedFilter.selected_min,
                              appliedFilter.currency
                            )}
                            ${" "}
                            -
                            ${" "}
                            ${helpers.labelFormatter(
                              appliedFilter.display_format,
                              appliedFilter.selected_max,
                              appliedFilter.currency
                            )}
                          </span>
                        </span>
                      </span>
                      <span class="applied-filter-action-clear">
                        <${args.templates.closeIcon} />
                      </span>
                    </li>
                  `;
                }
                return appliedFilter.items.map((filterItem) => {
                  return html`
                    <li
                      class="applied-filter"
                      onClick=${() =>
                        helpers.clearFilter(appliedFilter.id, filterItem.id)}
                      aria-label=${`Clear filter by ${filter.name}`}
                    >
                      <span class="applied-filter-label">
                        <span>
                          <span class="applied-filter-name">
                            ${filter.name}:
                          </span>
                          <span class="applied-filter-item-name">
                            ${filterItem.name}
                          </span>
                        </span>
                        <span class="applied-filter-action-clear">
                          <${args.templates.closeIcon} />
                        </span>
                      </span>
                    </li>
                  `;
                });
              })}
            </ul>
          `;
        },
      },
      paginationLinks: {
        options: {
          showNumberedPageLinks: true,
          numberedPageLinksWindowSize: 2,
          showPreviousPageLink: true,
          showFirstPageLink: false,
          showNextPageLink: true,
          scrollTop: true
        },
        render: function (html, args) {
          var props = args.props;
          var helpers = props.helpers;
          var labels = args.labels;
          var pagesToDisplay = helpers.getPagesToDisplay(
            props.numberedPageLinksWindowSize
          );
          var currentPage = helpers.getCurrentPage();
          var hasNextPage = helpers.hasNextPage();

          // append last page
          var apiResponse = helpers.getAPIResponse()
          var totalPages = apiResponse.total_pages
          var totalResults = apiResponse.total
          if (totalResults <= 1000) {
            pagesToDisplay = TagalysCustomizations.utilities.getPagesToDisplay(currentPage,totalPages,props.numberedPageLinksWindowSize)
          }

          return html`
            <div class="pagination">
              ${(props.showPreviousPageLink)
                ? html`
                    <button
                      class=${`btn${currentPage === 1 ? " disabled previous" : " previous"}`}
                      onclick=${currentPage === 1
                        ? undefined
                        : helpers.goToPreviousPage}
                    >
                      <svg aria-hidden="true" focusable="false" role="presentation" class="icon icon-chevron-left" viewBox="0 0 284.49 498.98"><defs><style>.cls-1{fill:#231f20}</style></defs><path class="cls-1" d="M249.49 0a35 35 0 0 1 24.75 59.75L84.49 249.49l189.75 189.74a35.002 35.002 0 1 1-49.5 49.5L10.25 274.24a35 35 0 0 1 0-49.5L224.74 10.25A34.89 34.89 0 0 1 249.49 0z"></path></svg>
                    </button>
                  `
                : null}
              ${props.showNumberedPageLinks
                ? pagesToDisplay.map((pageDetail, index) => {
                    var classes = ["btn"];
                    var showEllipsis = pageDetail.jumpAfter;
                    if (pageDetail.current) classes.push("active");
                    if (pageDetail.jumpAfter) classes.push("page-jump-over");
                    var className = classes.join(" ");
                    return html`
                      <button
                        key=${index}
                        class=${`${className}`}
                        onclick=${() => {
                          !showEllipsis && helpers.goToPage(pageDetail.page);
                        }}
                      >
                        ${showEllipsis ? "..." : pageDetail.page}
                      </button>
                    `;
                  })
                : null}
              ${(props.showNextPageLink)
                ? html`
                    <button
                      class=${`btn${!hasNextPage ? " disabled next" : " next"}`}
                      onclick=${hasNextPage ? helpers.goToNextPage : undefined}
                    >
                      <svg aria-hidden="true" focusable="false" role="presentation" class="icon icon-chevron-right" viewBox="0 0 284.49 498.98"><defs><style>.cls-1{fill:#231f20}</style></defs><path class="cls-1" d="M35 498.98a35 35 0 0 1-24.75-59.75l189.74-189.74L10.25 59.75a35.002 35.002 0 0 1 49.5-49.5l214.49 214.49a35 35 0 0 1 0 49.5L59.75 488.73A34.89 34.89 0 0 1 35 498.98z"></path></svg>
                    </button>
                  `
                : null}
            </div>
          `;
        },
      },
      products: {
        callbacks: {
          afterEveryRender: function(helpers) {
            TagalysCustomizations.utilities.initProductRatings(helpers, {
              baseSelector: ".search-results-container",
              widgetContext: "search-results"
            })
          }
        }
      }
    },
  });
}