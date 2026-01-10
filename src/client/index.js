/// <reference path="core.js" />

let config;

// CSP Partner Storage
const CSP_STORAGE_KEY = 'emulator_csp_partners';

function loadCspPartners() {
    try {
        const stored = localStorage.getItem(CSP_STORAGE_KEY);
        if (stored) {
            return JSON.parse(stored);
        }
    } catch (e) {
        console.error('Failed to load CSP partners:', e);
    }
    // Default CSP partners
    return [
        {
            id: 'default-csp',
            name: 'Sample CSP Partner',
            email: 'admin@msppartner.com',
            oid: guid(),
            tid: guid()
        }
    ];
}

function saveCspPartners(partners) {
    try {
        localStorage.setItem(CSP_STORAGE_KEY, JSON.stringify(partners));
    } catch (e) {
        console.error('Failed to save CSP partners:', e);
    }
}

function populateCspDropdown() {
    const $select = $('#cspPartnerSelect');
    const currentValue = $select.val();

    // Clear existing options except first (Direct Purchase)
    $select.find('option:not(:first)').remove();

    // Add CSP partners
    const partners = loadCspPartners();
    partners.forEach(partner => {
        $select.append($('<option></option>')
            .val(partner.id)
            .text(partner.name)
            .data('partner', partner));
    });

    // Add custom option
    $select.append($('<option value="__custom__">(Custom - Enter manually)</option>'));

    // Restore selection if still exists
    if (currentValue && $select.find(`option[value="${currentValue}"]`).length > 0) {
        $select.val(currentValue);
    }
}

async function showCspManagementDialog() {
    const partners = loadCspPartners();

    let html = `
        <div class="csp-management">
            <div class="csp-list">
                ${partners.map(p => `
                    <div class="csp-item" data-id="${p.id}">
                        <div class="csp-info">
                            <strong>${escapeHtml(p.name)}</strong>
                            <span>${escapeHtml(p.email)}</span>
                        </div>
                        <div class="csp-actions">
                            <button class="edit-csp secondary small">Edit</button>
                            <button class="delete-csp secondary small">Delete</button>
                        </div>
                    </div>
                `).join('')}
                ${partners.length === 0 ? '<div class="no-csps">No CSP partners configured</div>' : ''}
            </div>
            <hr />
            <div class="csp-form">
                <input type="hidden" id="cspEditId" value="" />
                <div>
                    <label>Name</label>
                    <input id="cspName" type="text" placeholder="Partner Company Name" />
                </div>
                <div>
                    <label>Email</label>
                    <input id="cspEmail" type="email" placeholder="admin@partner.com" />
                </div>
                <div>
                    <label>Object ID</label>
                    <input id="cspOid" type="text" placeholder="AAD Object ID (or leave blank to generate)" />
                </div>
                <div>
                    <label>Tenant ID</label>
                    <input id="cspTid" type="text" placeholder="AAD Tenant ID (or leave blank to generate)" />
                </div>
                <div class="form-actions">
                    <button id="saveCspButton" class="primary">Add Partner</button>
                    <button id="cancelCspEditButton" class="secondary" style="display:none;">Cancel</button>
                </div>
            </div>
        </div>
    `;

    await showDialog(html, 'Manage CSP Partners', {
        'Done': () => true
    }, 'csp-dialog');

    // Refresh dropdown after dialog closes
    populateCspDropdown();
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Event delegation for CSP management dialog
$(document).on('click', '.csp-management .edit-csp', function() {
    const $item = $(this).closest('.csp-item');
    const id = $item.data('id');
    const partners = loadCspPartners();
    const partner = partners.find(p => p.id === id);

    if (partner) {
        $('#cspEditId').val(partner.id);
        $('#cspName').val(partner.name);
        $('#cspEmail').val(partner.email);
        $('#cspOid').val(partner.oid);
        $('#cspTid').val(partner.tid);
        $('#saveCspButton').text('Update Partner');
        $('#cancelCspEditButton').show();
    }
});

$(document).on('click', '.csp-management .delete-csp', function() {
    const $item = $(this).closest('.csp-item');
    const id = $item.data('id');
    let partners = loadCspPartners();
    partners = partners.filter(p => p.id !== id);
    saveCspPartners(partners);
    $item.fadeOut(() => {
        $item.remove();
        if (partners.length === 0) {
            $('.csp-management .csp-list').html('<div class="no-csps">No CSP partners configured</div>');
        }
    });
});

$(document).on('click', '#saveCspButton', function() {
    const editId = $('#cspEditId').val();
    const name = $('#cspName').val().trim();
    const email = $('#cspEmail').val().trim();
    const oid = $('#cspOid').val().trim() || guid();
    const tid = $('#cspTid').val().trim() || guid();

    if (!name) {
        alert('Please enter a partner name');
        return;
    }

    let partners = loadCspPartners();

    if (editId) {
        // Update existing
        const index = partners.findIndex(p => p.id === editId);
        if (index !== -1) {
            partners[index] = { id: editId, name, email, oid, tid };
        }
    } else {
        // Add new
        partners.push({
            id: 'csp-' + guid().substring(0, 8),
            name,
            email,
            oid,
            tid
        });
    }

    saveCspPartners(partners);

    // Refresh the dialog
    showCspManagementDialog();
});

$(document).on('click', '#cancelCspEditButton', function() {
    $('#cspEditId').val('');
    $('#cspName').val('');
    $('#cspEmail').val('');
    $('#cspOid').val('');
    $('#cspTid').val('');
    $('#saveCspButton').text('Add Partner');
    $('#cancelCspEditButton').hide();
});

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

    $("#beneficiaryEmail").val(defaultBeneficiary.email);
    $("#beneficiaryOid").val(defaultBeneficiary.oid);
    $("#beneficiaryTid").val(defaultBeneficiary.tid);

    // Initially set purchaser same as beneficiary (direct purchase)
    $("#purchaserEmail").val(defaultBeneficiary.email);
    $("#purchaserOid").val(defaultBeneficiary.oid);
    $("#purchaserTid").val(defaultBeneficiary.tid);

    const $purchaserInputs = $("#purchaserEmail,#purchaserOid,#purchaserTid");
    const $purchaserToggle = $("#purchaserIsBeneficiary");
    const $cspSelect = $("#cspPartnerSelect");
    const $toggleOptionalFields = $("section.purchase .toggle-optional a");
    const $planSelect = $("section.purchase select[id!='cspPartnerSelect']");

    // Initialize CSP dropdown
    populateCspDropdown();

    // CSP Partner selection change
    $cspSelect.on("change", () => {
        const selectedValue = $cspSelect.val();
        const isCustom = selectedValue === '__custom__';
        const isCsp = selectedValue && selectedValue !== '__custom__';

        if (isCsp) {
            // Get selected partner data
            const partner = $cspSelect.find(':selected').data('partner');
            if (partner) {
                $("#purchaserEmail").val(partner.email);
                $("#purchaserOid").val(partner.oid);
                $("#purchaserTid").val(partner.tid);
            }
            // Disable manual purchaser toggle when CSP is selected
            $purchaserToggle.prop("checked", false).prop("disabled", true);
            $purchaserInputs.attr("disabled", true);
        } else if (isCustom) {
            // Enable manual entry for custom CSP
            $purchaserToggle.prop("checked", true).prop("disabled", true);
            $purchaserInputs.attr("disabled", false).parent().removeClass("hidden");
            // Set some defaults for custom
            $("#purchaserEmail").val("custom@partner.com");
            $("#purchaserOid").val(guid());
            $("#purchaserTid").val(guid());
        } else {
            // Direct purchase - reset purchaser to same as beneficiary
            $("#purchaserEmail").val($("#beneficiaryEmail").val());
            $("#purchaserOid").val($("#beneficiaryOid").val());
            $("#purchaserTid").val($("#beneficiaryTid").val());
            // Re-enable manual purchaser toggle
            $purchaserToggle.prop("disabled", false).prop("checked", false);
        }
    });

    // Manage CSPs button
    $("#manageCspsButton").on("click", () => {
        showCspManagementDialog();
    });

    $purchaserToggle.on("change", () => {
        const selectedCsp = $cspSelect.val();
        const showPurchaser = $purchaserToggle.is(":checked") && !selectedCsp;
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

    const $plans = $("section.purchase select:not(#cspPartnerSelect)").empty();

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

    const selectedCsp = $("#cspPartnerSelect").val();
    const isCspPurchase = selectedCsp && selectedCsp !== '';
    const manualPurchaser = $("#purchaserIsBeneficiary").is(":checked");
    const useDifferentPurchaser = isCspPurchase || manualPurchaser;
    const $plans = $("section.purchase select:not(#cspPartnerSelect)");

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