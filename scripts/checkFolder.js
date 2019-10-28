const dirnameArr =__dirname.split('/')
if (dirnameArr[dirnameArr.length -1] !== 'dist') throw new Error('Trying to publish root. Please publish dist');
