import * as ImagePicker from 'expo-image-picker';

export const pickImage = async () => {
  const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.7 });
  return r.canceled ? null : r.assets[0].uri;
};
