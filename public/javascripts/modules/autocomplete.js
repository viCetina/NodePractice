function autocomplete(input, latInput, lngInput) {
 if(!input) return; //skip fn from runnig if there is not input in the page
 const dropdown = new google.maps.places.Autocomplete(input);

 dropdown.addListener('place_changed', () => {
 	const place = dropdown.getPlace();
 	latInput.value = place.geometry.location.lat();
 	lngInput.value = place.geometry.location.lng();
 });
 //dont submit when you press enter on the location
 input.on('keydown', (e) => {
 	if(e.keyCode === 13) e.preventDefault();
 });
}

export default autocomplete;