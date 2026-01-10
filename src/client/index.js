/// <reference path="core.js" />

let config;

$(async () => {
    // Configure purchase form

    const {result} = await callAPI("/api/util/config");
    config = result;

    // Default beneficiary (end customer)
    const defaultBeneficiary = {
        email: "customer@endcustomer.com",
        oid: guid(),
        tid: guid()
    }

    // Default CSP partner (purchaser for CSP purchases)
    const defaultCspPartner = {
        email: "admin@msppartner.com",
        oid: guid(),
        tid: guid()
    }

    $("#beneficiaryEmail").val(defaultBeneficiary.email);
    $("#beneficiaryOid").val(defaultBeneficiary.oid);
    $("#beneficiaryTid").val(defaultBeneficiary.tid);

    // Initially set purchaser same as beneficiary (direct purchase)
    $("#purchaserEmail").val(defaultBeneficiary.email);
    $("#purchaserOid").val(defaultBeneficiary.oid);
    $("#purchaserTid").val(defaultBeneficiary.tid);

    const $purchaserInputs = $("#purchaserEmail,#purchaserOid,#purchaserTid");
    const $purchaserToggle = $("#purchaserIsBeneficiary");
    const $cspToggle = $("#cspPurchase");
    const $toggleOptionalFields = $("section.purchase .toggle-optional a");
    const $planSelect = $("section.purchase select");

    // CSP Purchase toggle - auto-populate with CSP partner details
    $cspToggle.on("change", () => {
        const isCsp = $cspToggle.is(":checked");
        if (isCsp) {
            // Set purchaser to CSP partner (different tenant from beneficiary)
            $("#purchaserEmail").val(defaultCspPartner.email);
            $("#purchaserOid").val(defaultCspPartner.oid);
            $("#purchaserTid").val(defaultCspPartner.tid);
            // Disable manual purchaser toggle when CSP is enabled
            $purchaserToggle.prop("checked", false).prop("disabled", true);
            $purchaserInputs.attr("disabled", true);
        } else {
            // Reset purchaser to same as beneficiary (direct purchase)
            $("#purchaserEmail").val($("#beneficiaryEmail").val());
            $("#purchaserOid").val($("#beneficiaryOid").val());
            $("#purchaserTid").val($("#beneficiaryTid").val());
            // Re-enable manual purchaser toggle
            $purchaserToggle.prop("disabled", false);
        }
    });

    $purchaserToggle.on("change", () => {
        const showPurchaser = $purchaserToggle.is(":checked") && !$cspToggle.is(":checked");
        $purchaserInputs.attr("disabled", !showPurchaser).parent().toggleClass("hidden", !showPurchaser);
    });

    let displayOptionalFields = false;
    $toggleOptionalFields.on("click", () => {
            $("section.purchase div.optional").toggleClass("hidden", displayOptionalFields);
            $purchaserToggle.trigger("change");
            displayOptionalFields = !displayOptionalFields;
            $toggleOptionalFields.text(!displayOptionalFields ? "Show optional fields" : "Hide optional fields");
            return false;
        });

    $planSelect.on("change", () => {
        const offer = $planSelect.data("offer");
        $("section.purchase .seat-count input").val('');
        $("section.purchase .seat-count").css({visibility: offer.plans[$planSelect.val()].isPricePerSeat ? 'visible' : 'hidden'});
    });

    // Configure buttons

    $("#viewJsonButton").on("click", showJson);
    $("#viewTokenButton").on("click", showToken);
    $("#purchaseButton").on("click", postToLanding);

    // Retrieve offers

    const offerCount = await renderOffers($('section.offers'), 'Get it now', (e, offer) => {
        $("section.purchase > div").removeClass("hidden");
        $("section.purchase > div.placeholder").addClass("hidden");
        selectOffer(offer);
        return false;
    });

    if (offerCount === 0) {
        $('article .samples').hide();
        $('section.purchase').hide();
        $('section.offers .no-offers').show();
    }

});

function selectOffer(offer) {
    
    $("#subscriptionId").val(guid());

    $("section.purchase .offer > span:first-child").text(offer.displayName);
    $("section.purchase .offer > span:last-child").text(offer.publisher);

    const $plans = $("section.purchase select").empty();

    for (const planId in offer.plans) {
        if (!Object.prototype.hasOwnProperty.call(offer.plans, planId)) {
            continue;
        }

        const plan = offer.plans[planId];

        $plans.data("offer", offer).append($("<option></option>")
            .html(planId + " - " + plan.displayName)
            .val(planId));
    }

    $plans.trigger("change");
}

function generateToken() {

    const isCspPurchase = $("#cspPurchase").is(":checked");
    const manualPurchaser = $("#purchaserIsBeneficiary").is(":checked");
    const useDifferentPurchaser = isCspPurchase || manualPurchaser;
    const $plans = $("section.purchase select");

    const sub = {
        "id": $('#subscriptionId').val(),
        "name": $('#subscriptionName').val(),
        "offerId": $plans.data("offer").offerId,
        "planId": $plans.val(),
        "beneficiary": {
            "emailId": $('#beneficiaryEmail').val(),
            "objectId": $('#beneficiaryOid').val(),
            "tenantId": $('#beneficiaryTid').val()
        },
        "purchaser": {
            "emailId": useDifferentPurchaser ? $("#purchaserEmail").val() : $("#beneficiaryEmail").val(),
            "objectId": useDifferentPurchaser ? $('#purchaserOid').val() : $("#beneficiaryOid").val(),
            "tenantId": useDifferentPurchaser ? $('#purchaserTid').val() : $("#beneficiaryTid").val()
        },
        "quantity": parseInt($('#quantity').val()),
        "autoRenew": false,
        "isTest": false,
        "isFreeTrial": false,
        // CSP purchases restrict customer operations to Read-only
        // Direct purchases allow Read, Update, Delete
        "allowedCustomerOperations": isCspPurchase ? ["Read"] : ["Read", "Update", "Delete"],
        // sandboxType "None" for both production-like direct and CSP purchases
        // (sandboxType "Csp" is only for CSP sandbox testing, not production CSP simulation)
        "sandboxType": "None"
    }

    const json = JSON.stringify(sub, null, 2);
    const base64 = window.btoa(json);

    return {json, base64};
}

async function showJson() {
    const {json} = generateToken();
    await showDialog(`<pre>${highlightJson(json)}</pre>`, "Subscription JSON", {
        "Copy": ($btn) => {
            $btn.text("Copied");
            navigator.clipboard.writeText(json);
            window.setTimeout(() => $btn.text("Copy"), 2000);
        }
    });
}

async function showToken() {
    const {base64} = generateToken();
    await showDialog(`<pre>${base64}</pre>`, "Marketplace Token", {
        "Copy": ($btn) => {
            $btn.text("Copied");
            navigator.clipboard.writeText(base64);
            window.setTimeout(() => $btn.text("Copy"), 2000);
        }
    });
}

// post the token to the given landing page URL
async function postToLanding() {
    const {base64} = generateToken();

    if (config === undefined) {
      await showAlert("Something went wrong trying to get config from the emulator", "Error");
      return;
    }

    const landingPage = config.landingPageUrl;

    if (!landingPage) {
        await showAlert("No landing page URL set in config", "Landing Page");
        return;
    }

    if (checkLandingPageUrl(landingPage)) {
        const ok = await showYesNo('The landing page is set to localhost but the emulator appears to be running on a remote host. Please confirm the landing page URL is correct. Visit the Config page to check.<br /><br />Would you like to continue?', "Landing Page");
        if (!ok) {
            return;
        }
    }

    const target = landingPage + '?token=' + base64;

    if (config.landingPageUrl.toLowerCase().startsWith(window.location.origin.toLowerCase())) {
        window.location.href = target;
    }
    else {
        window.open(target, '_blank');
    }
  }

  // Check if we're running on a remote host but the landing page has been left as default (localhost)
  function checkLandingPageUrl(landingPageUrl) {
    return landingPageUrl.startsWith('http://localhost') && $(location).attr('hostname') !== 'localhost';
  }