// FINAL PROJECT: OVEN SHARE -- BERLIN'S NEWEST OVEN SHARING PLATFORM

// =======
// APP STATE
// =======

let ovens = [];
let bookings = JSON.parse(localStorage.getItem("bookings")) || [];
let cart = JSON.parse(localStorage.getItem("cart")) || [];

//=======
// MAP SETUP
//=======

const map = L.map("map").setView([52.52, 13.405], 12);

L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "&copy; OpenStreetMap contributors",
  referrerPolicy: "origin"
}).addTo(map);

const markerGroup = L.layerGroup().addTo(map);


// =======
// DOM ELEMENTS
// =======

const ovenCount = document.getElementById("ovenCount");
const selectedOven = document.getElementById("selectedOven");
const bookingForm = document.getElementById("bookingForm");
const bookingList = document.getElementById("bookingList");
const bookingTime = document.getElementById("bookingTime");
const message = document.getElementById("message");
const checkoutSummary = document.getElementById("checkoutSummary");
const grandTotal = document.getElementById("grandTotal");
const clearCartBtn = document.getElementById("clearCartBtn");
const confirmCheckoutBtn = document.getElementById("confirmCheckoutBtn");
const clearBookingsBtn = document.getElementById("clearBookingsBtn");

const modal = document.getElementById("modal");
const modalText = document.getElementById("modalText");
const yesBtn = document.getElementById("yesBtn");
const noBtn = document.getElementById("noBtn");

const bookingModal = document.getElementById("bookingModal");
const bookingsModal = document.getElementById("bookingsModal");

const closeCheckoutBtn = document.getElementById("closeCheckoutBtn");
const closeConfirmationBtn = document.getElementById("closeConfirmationBtn");
const seeBookingsBtn = document.getElementById("seeBookingsBtn");

const filterType = document.getElementById("filterType");
const filterTemp = document.getElementById("filterTemp");
const filterCost = document.getElementById("filterCost");

const postcodeSearch = document.getElementById("postcodeSearch");
const postcodeSearchBtn = document.getElementById("postcodeSearchBtn");

const resetFiltersBtn = document.getElementById("resetFiltersBtn");
const resetPLZBtn = document.getElementById("resetPLZBtn");


// =======
// FETCH OVENS
// =======

fetch("ovens.json")
  .then(function(response) {
    return response.json();
  })
  .then(function(data) {
    ovens = data;

    populateOvenDropdown();
    populateTimeDropdown(bookingTime, "Select a time");
    renderOvens();
    renderBookings();
    renderCheckoutSummary();
  });


// =======
// CORE FUNCTIONS
// =======

function saveBookings() {
  localStorage.setItem("bookings", JSON.stringify(bookings));
}

function calculateBookingPrice(hourlyPrice, hours) {
  return hourlyPrice * hours;
}

function showConfirmation(text, onYes) {
  modalText.textContent = text;
  modal.classList.remove("hidden");

  yesBtn.onclick = function () {
    modal.classList.add("hidden");
    onYes();
  };

  noBtn.onclick = function () {
    modal.classList.add("hidden");
    message.textContent = "Action cancelled.";
  };
}

// --- TIME FUNCTIONS ---
// HELPER: DAY FROM DATE
// Removed for now, planned to use for filtering oven availability by date and time.

// function getDayFromDate(dateString) {
//  const date = new Date(dateString);
//  const options = { weekday: "long" };
//  return date.toLocaleDateString("en-US", options);
// } 

// Adjusting Time to 24H-Format
// Time dropdown at 30-Min intervals

function populateTimeDropdown(selectElement, placeholder) {
  selectElement.innerHTML =
    `<option value="">${placeholder}</option>`;

  for (let hour = 0; hour < 24; hour++) {
    ["00", "30"].forEach(function (minute) {
      const option = document.createElement("option");

      const timeValue =
        `${hour.toString().padStart(2, "0")}:${minute}`;

      option.value = timeValue;
      option.textContent = timeValue;

      selectElement.appendChild(option);
    });
  }
}

// =======
// OVEN FUNCTIONS
// =======

function createPopupContent(oven) {
  return `
    <strong>${oven.name}</strong><br>
    Type: ${oven.type}<br>
    Max temp: ${oven.maxTemp}<br>
    Price: €${oven.hourlyPrice}/hour<br>
    Notes: ${oven.notes}<br><br>
    <button class="popup-button" onclick="selectOvenById(${oven.id})"> Secure this oven now! </button>
  `;
}

function selectOvenById(ovenId) {
  const oven = ovens.find(function (oven) {
    return oven.id === ovenId;
  });

  selectedOven.value = oven.name;
  bookingModal.classList.remove("hidden");
  message.textContent = `Selected: ${oven.name}`;
}

window.selectOvenById = selectOvenById;


function renderOvens() {
  markerGroup.clearLayers();

  const selectedType = filterType.value;
  const selectedTemp = Number(filterTemp.value);
  const selectedCost = Number(filterCost.value);

  const filteredOvens = ovens.filter(function (oven) {
    const ovenTemp = Number(oven.maxTemp.replace("°C", ""));
    const matchesType =
      selectedType === "all" || oven.type === selectedType;
    const matchesTemp =
      ovenTemp >= selectedTemp;
    const matchesCost =
      oven.hourlyPrice <= selectedCost;
    return(
      matchesType && 
      matchesTemp &&
      matchesCost
    );
  });

  filteredOvens.forEach(function (oven) {
    L.marker([oven.lat, oven.lng])
      .addTo(markerGroup)
      .bindPopup(createPopupContent(oven));
  });

  ovenCount.textContent = `${filteredOvens.length} oven(s) shown`;
}

// =======
// BOOKING FUNCTIONS
// =======

function populateOvenDropdown() {
  selectedOven.innerHTML = '<option value="">Select an oven</option>';

  const sortedOvens = [...ovens].sort(function (a,b) {
    return a.name.localeCompare(b.name);
  });

  sortedOvens.forEach(function (oven) {
    const option = document.createElement("option");
    option.value = oven.name;
    option.textContent = oven.name;
    selectedOven.appendChild(option);
  });
}

function createBooking(oven, customer, date, time, hours) {
  return {
    ovenID: oven.id,
    ovenName: oven.name,
    customer: customer,
    date: date,
    time: time,
    hours: hours,
    hourlyPrice: oven.hourlyPrice,
    total: calculateBookingPrice(oven.hourlyPrice, hours)
  };
}

function renderCheckoutSummary() {
  checkoutSummary.innerHTML = "";
  if (cart.length === 0) {
    checkoutSummary.innerHTML = "<p>No booking selected yet.</p>";
    return;
  }

  let checkoutTotal = 0;

  cart.forEach(function (booking) {
    checkoutTotal += booking.total;

    const div = document.createElement("div");
    div.className = "booking-card";
    div.innerHTML = `
      <strong>${booking.ovenName}</strong><br>
      Name: ${booking.customer}<br>
      Date: ${booking.date}<br>
      Time: ${booking.time}<br>
      Duration: ${booking.hours} hour(s)<br>
      Total: €${booking.total.toFixed(2)}
    `;

    checkoutSummary.appendChild(div);
  });

  const totalDiv = document.createElement("div");
  totalDiv.innerHTML = `
    <hr>
    <p><strong>Checkout total: €${checkoutTotal.toFixed(2)}</strong></p>
  `;

  checkoutSummary.appendChild(totalDiv);
}

function renderBookings() {
  bookingList.innerHTML = "";

  if (bookings.length === 0) {
    bookingList.innerHTML = "<p>No bookings yet.</p>";
    grandTotal.textContent = "Total: €0"; // Grand total without any bookings.
    return;
  }

  let totalCost = 0;

  bookings.forEach(function (booking) {
    totalCost += booking.total;
    
    const div = document.createElement("div");
    div.className = "booking-card";

    div.innerHTML = `
      <strong>${booking.ovenName}</strong><br>
      Name: ${booking.customer}<br>
      Date: ${booking.date}<br>
      Time: ${booking.time}<br>
      Duration: ${booking.hours} hour(s)<br>
      Total: €${booking.total.toFixed(2)}
    `;

    bookingList.appendChild(div);
  });

  grandTotal.textContent = `Total: €${totalCost.toFixed(2)}`;
}


// =======
// EVENT LISTENERS
// =======

filterType.addEventListener("change", renderOvens);
filterTemp.addEventListener("change", renderOvens);
filterCost.addEventListener("change", renderOvens);

// --- SEARCH by PLZ ---

postcodeSearchBtn.addEventListener("click", function () {
  const postcode = Number(postcodeSearch.value.trim());

  if (isNaN(postcode)) {
    showMessage("Please enter a valid postal code.");
    return;
  }

  const matchingOvens = ovens.filter(function (oven) {
    const ovenPostcode = Number(oven.postcode);
    return(
      ovenPostcode >= postcode - 10 && 
      ovenPostcode <= postcode + 10
    );
  });

  if (matchingOvens.length === 0) {
    showMessage("No ovens found near that postal code.");
    return;
  }

  markerGroup.clearLayers();

  matchingOvens.forEach(function (oven) {
    L.marker([oven.lat, oven.lng])
      .addTo(markerGroup)
      .bindPopup(createPopupContent(oven));
  });

  const firstOven = matchingOvens[0];

  map.setView([firstOven.lat, firstOven.lng], 14);
  ovenCount.textContent = `${matchingOvens.length} oven(s) found in ${postcode}`;
  message.textContent = `Found ${matchingOvens.length} oven(s) near ${postcode}.`;
});

//--- BOOKING FORM ---

bookingForm.addEventListener("submit", function (event) {
  event.preventDefault();

  const oven = ovens.find(function (oven) {
    return oven.name === selectedOven.value;
  });

  if (!oven) {
    message.textContent = "Please select an oven from the map first.";
    return;
  }

  const customer = document.getElementById("customerName").value;
  const date = document.getElementById("bookingDate").value;
  const time = document.getElementById("bookingTime").value;
  const hours = Number(document.getElementById("bookingHours").value);
  const newBooking = createBooking(oven, customer, date, time, hours);

  if (isDuplicateBooking(newBooking)) {
    showMessage("This oven is not available for the selected time.");
    return;
  }
  cart.push(newBooking);
  localStorage.setItem("cart", JSON.stringify(cart));

  renderCheckoutSummary();
  message.textContent = "Review your booking details and confirm checkout.";

  // Reset form fields for next booking
  selectedOven.value = "";
  bookingDate.value = "";
  bookingTime.value = "";
  bookingHours.value = 1;
});

//--- HELPER: CHECK DUPLICATED BOOKINGS ---

function timeToMinutes(time) {
  const parts = time.split(":");
  const hours = Number(parts[0]);
  const minutes = Number(parts[1]);

  return hours * 60 + minutes;
}

function isDuplicateBooking(newBooking) {
  const newStart = timeToMinutes(newBooking.time);
  const newEnd = newStart + newBooking.hours * 60;

  function overlaps(existingBooking) {
    if (
      existingBooking.ovenID !== newBooking.ovenID ||
      existingBooking.date !== newBooking.date
    ){
      return false;
    }

    const existingStart = timeToMinutes(existingBooking.time);
    const existingEnd = existingStart + existingBooking.hours * 60;

    return (
      newStart < existingEnd &&
      newEnd > existingStart
    );
  }

  const overlapsConfirmed = bookings.some(overlaps);
  const overlapsCart = cart.some(overlaps);

  return (
    overlapsConfirmed || overlapsCart
  );
}


//--- CHECKOUT ---

confirmCheckoutBtn.addEventListener("click", function () {
  if (cart.length === 0) {
    showMessage("Please create a booking first.");
    return;
  }

  let checkoutTotal = 0;

  cart.forEach(function (booking) {
    checkoutTotal += booking.total;
  });

  showConfirmation(
    `Confirm ${cart.length} booking(s)?\nTotal: €${checkoutTotal.toFixed(2)}`,
    function () {
      const confirmedCount = cart.length;

      cart.forEach(function (booking) {
        bookings.push(booking);
      });

      saveBookings();
      renderBookings();

      cart = [];
      localStorage.setItem("cart", JSON.stringify(cart));

      renderCheckoutSummary();
      bookingForm.reset();
      bookingModal.classList.add("hidden");

      showMessage(
        `Checkout complete!\n\nYou booked ${confirmedCount} oven(s).\nThank you for using Oven Share.`
      );
    }
  );
});

function showMessage(text) {
  modalText.textContent = text;

  modal.classList.remove("hidden");

  yesBtn.textContent = "OK";
  noBtn.style.display = "none";

  yesBtn.onclick = function () {
    modal.classList.add("hidden");

    yesBtn.textContent = "Yes";
    noBtn.style.display = "inline-block";
  };
}

// === CLEARING MESSAGES ===

// --- CLEAR CART ---
clearCartBtn.addEventListener("click", function () {
  if (cart.length === 0) {
    showMessage("Your cart is already empty.");
    return;
  }

  showConfirmation(
    "Remove all bookings from cart?",
    function () {
      cart = [];
      localStorage.setItem("cart", JSON.stringify(cart));
      renderCheckoutSummary();

      bookingForm.reset();
      selectedOven.value = "";
      showMessage("Cart cleared.");
    }
  );
});

//--- CLEAR BOOKINGS ---
clearBookingsBtn.addEventListener("click", function () {
  if (bookings.length === 0) {
    showMessage("No bookings to clear.");
    return;
  }

  showConfirmation(
    "Are you sure you want to clear all bookings?",
    function () {
      bookings = [];
      saveBookings();
      renderBookings();

      bookingsModal.classList.add("hidden");
      showMessage("All bookings have been cleared.");
    }
  );
});

seeBookingsBtn.addEventListener("click", function () {
  renderBookings();
  bookingsModal.classList.remove("hidden");
});

closeCheckoutBtn.addEventListener("click", function () {
  bookingModal.classList.add("hidden");
});

closeConfirmationBtn.addEventListener("click", function () {
  bookingsModal.classList.add("hidden");
});

// --- RESET FILTERS ---

resetFiltersBtn.addEventListener("click", function () {
  filterType.value = "all";
  filterTemp.value = "0";
  filterCost.value = "999";
  renderOvens();
  message.textContent = "Filters reset.";
});

// --- RESET PLZ SEARCH ---

resetPLZBtn.addEventListener("click", function () {
  postcodeSearch.value = "";
  renderOvens();
  map.setView([52.52, 13.405], 12);
  message.textContent = "Showing all ovens.";
});