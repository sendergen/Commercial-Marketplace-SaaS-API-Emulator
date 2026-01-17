/// <reference path="core.js" />

let config;

// CSP Partners - loaded from server API
let cspPartners = [];

// Customers - loaded from server API
let customers = [];

async function loadCspPartners() {
    try {
        const response = await fetch('/api/util/csp-partners');
        if (response.ok) {
            cspPartners = await response.json();
        }
    } catch (e) {
        console.error('Failed to load CSP partners:', e);
    }
    return cspPartners;
}

async function saveCspPartner(partner) {
    try {
        const response = await fetch('/api/util/csp-partners', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(partner)
        });
        if (response.ok) {
            await loadCspPartners();
        }
        return response.ok;
    } catch (e) {
        console.error('Failed to save CSP partner:', e);
        return false;
    }
}

async function deleteCspPartner(id) {
    try {
        const response = await fetch(`/api/util/csp-partners/${id}`, {
            method: 'DELETE'
        });
        if (response.ok) {
            await loadCspPartners();
        }
        return response.ok;
    } catch (e) {
        console.error('Failed to delete CSP partner:', e);
        return false;
    }
}

async function loadCustomers() {
    try {
        const response = await fetch('/api/util/customers');
        if (response.ok) {
            customers = await response.json();
        }
    } catch (e) {
        console.error('Failed to load customers:', e);
    }
    return customers;
}

async function saveCustomer(customer) {
    try {
        const response = await fetch('/api/util/customers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(customer)
        });
        if (response.ok) {
            await loadCustomers();
        }
        return response.ok;
    } catch (e) {
        console.error('Failed to save customer:', e);
        return false;
    }
}

async function deleteCustomer(id) {
    try {
        const response = await fetch(`/api/util/customers/${id}`, {
            method: 'DELETE'
        });
        if (response.ok) {
            await loadCustomers();
        }
        return response.ok;
    } catch (e) {
        console.error('Failed to delete customer:', e);
        return false;
    }
}

function populateCspDropdown() {
    const $select = $('#cspPartnerSelect');
    const currentValue = $select.val();

    // Clear existing options except first (Direct Purchase)
    $select.find('option:not(:first)').remove();

    // Add CSP partners
    cspPartners.forEach(partner => {
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

function populateCustomerDropdown() {
    const $select = $('#customerSelect');
    const currentValue = $select.val();

    // Clear existing options except first (Custom - Enter manually)
    $select.find('option:not(:first)').remove();

    // Add customers
    customers.forEach(customer => {
        $select.append($('<option></option>')
            .val(customer.id)
            .text(customer.name)
            .data('customer', customer));
    });

    // Restore selection if still exists
    if (currentValue && $select.find(`option[value="${currentValue}"]`).length > 0) {
        $select.val(currentValue);
    }
}

async function showCspManagementDialog() {
    let html = `
        <div class="csp-management">
            <div class="csp-list">
                ${cspPartners.map(p => `
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
                ${cspPartners.length === 0 ? '<div class="no-csps">No CSP partners configured</div>' : ''}
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

async function showCustomerManagementDialog() {
    let html = `
        <div class="customer-management">
            <div class="customer-list">
                ${customers.map(c => `
                    <div class="customer-item" data-id="${c.id}">
                        <div class="customer-info">
                            <strong>${escapeHtml(c.name)}</strong>
                            <span>${escapeHtml(c.emailId)}</span>
                        </div>
                        <div class="customer-actions">
                            <button class="edit-customer secondary small">Edit</button>
                            <button class="delete-customer secondary small">Delete</button>
                        </div>
                    </div>
                `).join('')}
                ${customers.length === 0 ? '<div class="no-customers">No customers configured</div>' : ''}
            </div>
            <hr />
            <div class="customer-form">
                <input type="hidden" id="customerEditId" value="" />
                <div>
                    <label>Name</label>
                    <input id="customerName" type="text" placeholder="Customer Company Name" />
                </div>
                <div>
                    <label>Email</label>
                    <input id="customerEmail" type="email" placeholder="customer@company.com" />
                </div>
                <div>
                    <label>Object ID</label>
                    <input id="customerOid" type="text" placeholder="AAD Object ID (or leave blank to generate)" />
                </div>
                <div>
                    <label>Tenant ID</label>
                    <input id="customerTid" type="text" placeholder="AAD Tenant ID (or leave blank to generate)" />
                </div>
                <div class="form-actions">
                    <button id="saveCustomerButton" class="primary">Add Customer</button>
                    <button id="cancelCustomerEditButton" class="secondary" style="display:none;">Cancel</button>
                </div>
            </div>
        </div>
    `;

    await showDialog(html, 'Manage Customers', {
        'Done': () => true
    }, 'customer-dialog');

    // Refresh dropdown after dialog closes
    populateCustomerDropdown();
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
    const partner = cspPartners.find(p => p.id === id);

    if (partner) {
        $('#cspEditId').val(partner.id);
        $('#cspName').val(partner.name);
        $('#cspEmail').val(partner.email);
        $('#cspOid').val(partner.oid || '');
        $('#cspTid').val(partner.tid || '');
        $('#saveCspButton').text('Update Partner');
        $('#cancelCspEditButton').show();
    }
});

$(document).on('click', '.csp-management .delete-csp', async function() {
    const $item = $(this).closest('.csp-item');
    const id = $item.data('id');

    if (await deleteCspPartner(id)) {
        $item.fadeOut(() => {
            $item.remove();
            if (cspPartners.length === 0) {
                $('.csp-management .csp-list').html('<div class="no-csps">No CSP partners configured</div>');
            }
        });
    }
});

$(document).on('click', '#saveCspButton', async function() {
    const editId = $('#cspEditId').val();
    const name = $('#cspName').val().trim();
    const email = $('#cspEmail').val().trim();
    const oid = $('#cspOid').val().trim() || guid();
    const tid = $('#cspTid').val().trim() || guid();

    if (!name) {
        alert('Please enter a partner name');
        return;
    }

    const partner = {
        id: editId || 'csp-' + guid().substring(0, 8),
        name,
        email,
        oid,
        tid
    };

    if (await saveCspPartner(partner)) {
        // Refresh the dialog
        showCspManagementDialog();
    }
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

// Event delegation for Customer management dialog
$(document).on('click', '.customer-management .edit-customer', function() {
    const $item = $(this).closest('.customer-item');
    const id = $item.data('id');
    const customer = customers.find(c => c.id === id);

    if (customer) {
        $('#customerEditId').val(customer.id);
        $('#customerName').val(customer.name);
        $('#customerEmail').val(customer.emailId);
        $('#customerOid').val(customer.objectId || '');
        $('#customerTid').val(customer.tenantId || '');
        $('#saveCustomerButton').text('Update Customer');
        $('#cancelCustomerEditButton').show();
    }
});

$(document).on('click', '.customer-management .delete-customer', async function() {
    const $item = $(this).closest('.customer-item');
    const id = $item.data('id');

    if (await deleteCustomer(id)) {
        $item.fadeOut(() => {
            $item.remove();
            if (customers.length === 0) {
                $('.customer-management .customer-list').html('<div class="no-customers">No customers configured</div>');
            }
        });
    }
});

$(document).on('click', '#saveCustomerButton', async function() {
    const editId = $('#customerEditId').val();
    const name = $('#customerName').val().trim();
    const emailId = $('#customerEmail').val().trim();
    const objectId = $('#customerOid').val().trim() || guid();
    const tenantId = $('#customerTid').val().trim() || guid();

    if (!name) {
        alert('Please enter a customer name');
        return;
    }

    const customer = {
        id: editId || 'customer-' + guid().substring(0, 8),
        name,
        emailId,
        objectId,
        tenantId
    };

    if (await saveCustomer(customer)) {
        // Refresh the dialog
        showCustomerManagementDialog();
    }
});

$(document).on('click', '#cancelCustomerEditButton', function() {
    $('#customerEditId').val('');
    $('#customerName').val('');
    $('#customerEmail').val('');
    $('#customerOid').val('');
    $('#customerTid').val('');
    $('#saveCustomerButton').text('Add Customer');
    $('#cancelCustomerEditButton').hide();
});

$(async () => {
    // Configure purchase form

    const {result} = await callAPI("/api/util/config");
    config = result;

    // Load CSP partners and customers from server
    await loadCspPartners();
    await loadCustomers();

    // Default beneficiary (end customer) - use first customer if available
    const defaultCustomer = customers.length > 0 ? customers[0] : null;
    const defaultBeneficiary = defaultCustomer ? {
        email: defaultCustomer.emailId,
        oid: defaultCustomer.objectId,
        tid: defaultCustomer.tenantId
    } : {
        email: "customer@endcustomer.com",
        oid: guid(),
        tid: guid()
    };

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
    const $customerSelect = $("#customerSelect");
    const $toggleOptionalFields = $("section.purchase .toggle-optional a");
    const $planSelect = $("section.purchase select[id!='cspPartnerSelect'][id!='customerSelect']");

    // Initialize dropdowns
    populateCspDropdown();
    populateCustomerDropdown();

    // Set initial customer selection if we have customers
    if (defaultCustomer) {
        $customerSelect.val(defaultCustomer.id);
    }

    // Customer selection change - auto-fill beneficiary fields
    $customerSelect.on("change", () => {
        const selectedValue = $customerSelect.val();

        if (selectedValue) {
            // Get selected customer data
            const customer = $customerSelect.find(':selected').data('customer');
            if (customer) {
                $("#beneficiaryEmail").val(customer.emailId);
                $("#beneficiaryOid").val(customer.objectId);
                $("#beneficiaryTid").val(customer.tenantId);

                // Also update purchaser if not using CSP
                const selectedCsp = $cspSelect.val();
                if (!selectedCsp) {
                    $("#purchaserEmail").val(customer.emailId);
                    $("#purchaserOid").val(customer.objectId);
                    $("#purchaserTid").val(customer.tenantId);
                }
            }
        }
    });

    // Manage Customers button
    $("#manageCustomersButton").on("click", () => {
        showCustomerManagementDialog();
    });

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

    const $plans = $("section.purchase select:not(#cspPartnerSelect):not(#customerSelect)").empty();

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
    const $plans = $("section.purchase select:not(#cspPartnerSelect):not(#customerSelect)");

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
