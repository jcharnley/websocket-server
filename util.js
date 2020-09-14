module.exports = {
	uuidc: function () {
		let sGuid = '';
		for (var i = 0; i < 32; i++) {
			sGuid += Math.floor(Math.random() * 0xf).toString(0xf);
		}
		return sGuid;
	},
};
