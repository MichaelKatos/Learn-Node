import axios from 'axios';
import {
  $
} from './bling';

// const mapOptions = {
//   center: {
//     lat,
//     lng
//   },
//   zoom: 2
// };

function error(err) {
  console.warn(`ERROR(${err.code}): ${err.message}`);
  h.flash('We are unable to access your location.  You must enable location access to find users near you!');
};

function loadPlaces(map, lat, lng) {
  axios.get(`/api/v1/stores/near?lat=${lat}&lng=${lng}`)
    .then(res => {
      const places = res.data;
      if (!places.length) {
        alert('no places found!');
        return;
      }

      //Create a bounds
      const bounds = new google.maps.LatLngBounds();
      const infoWindow = new google.maps.InfoWindow();

      const markers = places.map(place => {
        const [placeLng, placeLat] = place.location.coordinates;
        const position = {
          lat: placeLat,
          lng: placeLng
        };
        bounds.extend(position);
        const marker = new google.maps.Marker({
          map,
          position
        });
        marker.place = place;
        return marker;
      });

      //when someone clicks on a marker, show details of that place
      markers.forEach(marker => marker.addListener('click', function () {
        const html = `
          <div class="popup">
            <a href="/store/${this.place.slug}">
              <img src="/uploads/${this.place.photo || 'store.png'}" alt="${this.place.name}" />
              <p>
                ${this.place.name} - ${this.place.location.address}
              </p>
            </a>
          </div>
        `;
        infoWindow.setContent(html);
        infoWindow.open(map, this);

      }))

      //zoom to fit bounds perfectly
      map.setCenter(bounds.getCenter());
      map.fitBounds(bounds);
    })
    .catch(err => {
      console.warn(err);
    });
}

function makeMap(mapDiv) {
  if (!mapDiv) return;
  navigator.geolocation.getCurrentPosition((data) => {
    let lat = data.coords.latitude;
    let lng = data.coords.longitude;
    const map = new google.maps.Map(mapDiv, {
      center: {
        lat,
        lng
      },
      zoom: 10
    });
    loadPlaces(map, lat, lng);
    const input = $('[name="geolocate"]');
    const autocomplete = new google.maps.places.Autocomplete(input);
    // console.log(`lat is ${lat},long is ${lng}`);
    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      loadPlaces(map, place.geometry.location.lat(), place.geometry.location.lng());
    })
  }, error);
  //

}


export default makeMap;