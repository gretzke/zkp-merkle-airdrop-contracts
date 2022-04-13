snarkjs powersoftau new bn128 16 ./build/pot16_0000.ptau -v
snarkjs powersoftau contribute ./build/pot16_0000.ptau ./build/pot16_0001.ptau --name="First contribution" -v -e="some random text"
snarkjs powersoftau prepare phase2 ./build/pot16_0001.ptau ./build/pot16_final.ptau -v
snarkjs powersoftau verify ./build/pot16_final.ptau
rm ./build/pot16_0000.ptau
rm ./build/pot16_0001.ptau