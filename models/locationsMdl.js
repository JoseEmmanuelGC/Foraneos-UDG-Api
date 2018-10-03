const db = require('../db');
const Location = require('./location');

class LocationsMdl {
  static async get(locationId) {
    const locationTbl = await db.select('location', '',
      [{ col: 'id', oper: '=', val: locationId }]);
    const location = this.processResult(locationTbl)[0];

    const ownerFullnameTbl = await db.select('user',
      ['name', 'firstSurname', 'secondSurname'],
      [{ col: 'id', oper: '=', val: location.ownerUserId }]);

    location.setOwnerFullname(
      ownerFullnameTbl[0].name,
      ownerFullnameTbl[0].firstSurname,
      ownerFullnameTbl[0].secondSurname,
    );

    const images = [];

    try {
      const imagesTbl = await db.select('location_image',
        ['id', 'image', 'description'],
        [{ col: 'userId', oper: '=', val: location.id }]);


      imagesTbl.forEach((data) => {
        const image = {
          id: data.id,
          image: data.image,
          description: data.description,
        };
        images.push(image);
      });
    } catch (e) { console.log('No images'); }

    location.setImages(images);

    const services = [];

    const locationServiceTbl = await db.select('location_service',
      ['serviceId'],
      [{ col: 'locationId', oper: '=', val: location.id }]);


    const myPromises = locationServiceTbl.map(async (data) => {
      const service = await db.select('service', '',
        [{ col: 'id', oper: '=', val: `${data.serviceId}` }]);

      services.push({
        id: service[0].id,
        description: service[0].description,
        iconRef: service[0].iconRef,
      });
    });

    await Promise.all(myPromises);

    location.setServices(services);

    return JSON.stringify(location);
  }

  static async getAll() {
    const locationsTbl = await db.select('location',
      ['id', 'ownerUserId', 'active', 'lattitude',
        'longitude', 'colony', 'numRooms', 'availableRooms',
        'cost', 'avgRate', 'avgServicesRate', 'avgSecurityRate',
        'avgLocalizationRate', 'avgCostBenefictRate']);

    const locations = this.processResult(locationsTbl);

    const myPromises = locations.map(async (data) => {
      let imageAux = '';
      try {
        const imagesTbl = await db.select('location_image',
          ['image'],
          [{ col: 'locationId', oper: '=', val: data.id }]);

        imageAux = imagesTbl[0].image;
      } catch (e) { console.log('No images'); }
      data.setImage(imageAux);

      const services = [];

      const locationServiceTbl = await db.select('location_service',
        ['serviceId'],
        [{ col: 'locationId', oper: '=', val: data.id }]);


      const myPromises2 = locationServiceTbl.map(async (data2) => {
        const service = await db.select('service', '',
          [{ col: 'id', oper: '=', val: `${data2.serviceId}` }]);

        services.push({
          id: service[0].id,
          description: service[0].description,
          iconRef: service[0].iconRef,
        });
      });

      await Promise.all(myPromises2);

      data.setServices(services);
    });

    await Promise.all(myPromises);

    return JSON.stringify(locations);
  }

  static async create(
    {
      ownerUserId, lattitude, longitude, street,
      colony, postalCode, streetAcross1, streetAcross2,
      extNum, intNum, numRooms, description,
      restrictions, cost, images, services,
    },
  ) {
    const locationId = await db.insert('location',
      ['ownerUserId', 'lattitude', 'longitude', 'street',
        'colony', 'postalCode', 'streetAcross1', 'streetAcross2',
        'extNum', 'intNum', 'numRooms', 'description',
        'restrictions', 'cost', 'availableRooms', 'active'],
      [ownerUserId, lattitude, longitude, street,
        colony, postalCode, streetAcross1, streetAcross2,
        extNum, intNum, numRooms, description,
        restrictions, cost, numRooms, 0]);

    const myPromises = images.map(async (data) => {
      await db.insert('location_image',
        ['locationId', 'image', 'description'],
        [locationId, data.image, data.description]);
    });

    await Promise.all(myPromises);

    const myPromises2 = services.map(async (serviceId) => {
      await db.insert('location_service',
        ['locationId', 'serviceId'],
        [locationId, serviceId]);
    });

    await Promise.all(myPromises2);

    return this.get(locationId);
  }

  static async remove(userId) {

  }

  static async update(userId,
    {
      mainEmailId, userType, password, name,
      firstSurname, secondSurname, profileImage, birthYear,
      birthMonth, birthDay, gender,
    }) {
    const columnsUpdate = [];

    if (mainEmailId !== undefined) {
      const emailTbl = await db.selectAll('email',
        [{ col: 'userId', oper: '=', val: userId }]);

      if (emailTbl.some(data => data.id === mainEmailId)) {
        columnsUpdate.push({ col: 'mainEmailId', val: mainEmailId });
      } else {
        // Aqui va un error todo chido
        return this.get(userId);
      }
    }

    if (userType !== undefined) {
      columnsUpdate.push({ col: 'userType', val: userType });
    }

    if (password !== undefined) {
      columnsUpdate.push({ col: 'password', val: password });
    }

    if (name !== undefined) {
      columnsUpdate.push({ col: 'name', val: name });
    }

    if (firstSurname !== undefined) {
      columnsUpdate.push({ col: 'firstSurname', val: firstSurname });
    }

    if (secondSurname !== undefined) {
      columnsUpdate.push({ col: 'secondSurname', val: secondSurname });
    }

    if (profileImage !== undefined) {
      columnsUpdate.push({ col: 'profileImage', val: profileImage });
    }

    if (birthDay !== undefined && birthMonth !== undefined && birt !== undefined) {
      const birthdate = `${birthYear}-${birthMonth}-${birthDay}`;
      columnsUpdate.push({ col: 'birthdate', val: birthdate });
    }

    if (gender !== undefined) {
      columnsUpdate.push({ col: 'gender', val: gender });
    }

    await db.update('user', columnsUpdate,
      [{ col: 'id', oper: '=', val: userId }]);

    return this.get(userId);
  }

  static processResult(data) {
    this.result = [];
    data.forEach((obj) => {
      this.result.push(new Location(obj));
    });
    return this.result;
  }
}

module.exports = LocationsMdl;