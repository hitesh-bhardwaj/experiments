const isTouch = () => {
 try {
 document.createEvent('TouchEvent');
 return true;
 } catch {
 return false;
 }
}

const touchUtils = {
 isTouch: isTouch,
}

export default touchUtils
