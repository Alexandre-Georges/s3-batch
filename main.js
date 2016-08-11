var config = {
	accessKeyId: '',
	secretAccessKey: '',
	bucket: '',
	prefix: 'ce-error-logs-',
	limitDateString: '2016-07-29',
	testMode: false
};

if (process.argv[2]) {
	config.limitDateString = process.argv[2];
}

var AWS = require('aws-sdk');
AWS.config.update({
	accessKeyId: config.accessKeyId,
	secretAccessKey: config.secretAccessKey
});

function parseDate(date, isFileName) {
	var regex = /.+\/([0-9]{4})-([0-9]{2})-([0-9]{2})T.+/;
	if (!isFileName) {
		regex = /([0-9]{4})-([0-9]{2})-([0-9]{2})/;
	}
	var dateArray = date.match(regex);
	if (!dateArray) {
		return undefined;
	}
	return {
		year: parseInt(dateArray[1]),
		month: parseInt(dateArray[2]),
		day: parseInt(dateArray[3])
	};
}

function init() {
	config.limitDate = parseDate(config.limitDateString, false);
}
init();

var s3 = new AWS.S3();

function listObjects(currentMarker) {
	var params = {
		Bucket: config.bucket,
		Prefix: config.prefix
	};
	if (currentMarker) {
		params.Marker = currentMarker;
	}
	s3.listObjects(params, function(error, data) {
		if (error) {
			console.log(error, error.stack);
		} else {
			var list = [];
			for (var contentIndex in data.Contents) {
				var file = data.Contents[contentIndex];
				var fileDate = parseDate(file.Key, true);
				if (fileDate) {
					if (fileDate.year < config.limitDate.year
						|| fileDate.year === config.limitDate.year && fileDate.month < config.limitDate.month
						|| fileDate.year === config.limitDate.year && fileDate.month === config.limitDate.month && fileDate.day < config.limitDate.day) {
						list.push(file.Key);
					}
				}
			}
			if (list.length > 0) {
				removeObjects(list);
			}
			if (data.IsTruncated) {
				listObjects(data.Contents[data.Contents.length - 1].Key);
			}
		}
	});
};

function removeObjects(fileNames) {
	var objects = [];
	for (var fileNameIndex in fileNames) {
		objects.push({ Key: fileNames[fileNameIndex] });
	}
	var params = {
		Bucket: config.bucket,
  		Delete: {
    			Objects: objects,
    			Quiet: false
  		},
  	};
  	if (config.testMode === false) {	
		s3.deleteObjects(params, function (error, data) {
			if (error) {
				console.log(error, error.stack);
			} else {
				console.log('Files deleted');
				for (var deletedFileIndex in data.Deleted) {
					console.log(data.Deleted[deletedFileIndex].Key);
				}
			}
		});
	} else {
		console.log('Should have deleted');
		for (var index in objects) {
			console.log(objects[index]);
		}
	}
}

listObjects(null);
